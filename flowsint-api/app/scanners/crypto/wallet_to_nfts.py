import os
import socket
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
import requests
from app.scanners.base import Scanner
from app.types.wallet import Wallet, NFT
from app.utils import resolve_type
from app.core.logger import Logger
InputType: TypeAlias = List[Wallet]
OutputType: TypeAlias = List[NFT]

ETHERSCAN_API_URL = os.getenv("ETHERSCAN_API_URL")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")

class WalletAddressToNFTs(Scanner):
    """Resolve NFTs for a wallet address (ETH)."""

    @classmethod
    def name(cls) -> str:
        return "wallet_to_nfts"

    @classmethod
    def category(cls) -> str:
        return "crypto"
    
    @classmethod
    def key(cls) -> str:
        return "address"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            wallet_obj = None
            if isinstance(item, str):
                wallet_obj = Wallet(address=item)
            elif isinstance(item, dict) and "address" in item:
                wallet_obj = Wallet(address=item["address"])
            elif isinstance(item, Wallet):
                wallet_obj = item
            if wallet_obj:
                cleaned.append(wallet_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for d in data:
            try:
                nfts = self._get_nfts(d.address)
                results.append(nfts)
            except Exception as e:
                print(f"Error resolving nfts for {d.address}: {e}")
        return results
    
    def _get_nfts(self, address: str) -> List[NFT]:
        nfts = []
        """Get nfts for a wallet address."""
        params = {
        "module": "account",
        "action": "tokennfttx",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 10000,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY
    }
        response = requests.get(ETHERSCAN_API_URL, params=params)
        data = response.json()
        results = data["result"]
        for tx in results:
            nfts.append(NFT(
                wallet=Wallet(address=address),
                contract_address=tx["contractAddress"],
                token_id=tx["tokenID"],
                collection_name=tx["collectionName"],
                metadata_url=tx["metadataURL"],
                image_url=tx["imageURL"],
                name=tx["name"],
            ))
        return nfts
        

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for nfts in results:
            for nft in nfts:
                # Create or update wallet node
                wallet_query = """
                MERGE (cryptowallet:cryptowallet {wallet: $wallet_address})
                SET cryptowallet.sketch_id = $sketch_id,
                    cryptowallet.label = $wallet_address,
                    cryptowallet.caption = $wallet_address,
                    cryptowallet.type = "cryptowallet"
                """
                self.neo4j_conn.query(wallet_query, {
                    "wallet_address": nft.wallet.address,
                    "sketch_id": self.sketch_id
                })

                # Create or update NFT node
                nft_query = """
                MERGE (nft:nft {contract_address: $contract_address, token_id: $token_id})
                SET nft.collection_name = $collection_name,
                    nft.metadata_url = $metadata_url,
                    nft.image_url = $image_url,
                    nft.name = $name,
                    nft.sketch_id = $sketch_id,
                    nft.label = $name,
                    nft.caption = $name,
                    nft.type = "nft"
                """
                self.neo4j_conn.query(nft_query, {
                    "contract_address": nft.contract_address,
                    "token_id": nft.token_id,
                    "collection_name": nft.collection_name,
                    "metadata_url": nft.metadata_url,
                    "image_url": nft.image_url,
                    "name": nft.name,
                    "sketch_id": self.sketch_id
                })

                # Create relationship from wallet to NFT
                owns_query = """
                MATCH (wallet:wallet {wallet: $wallet_address})
                MATCH (nft:nft {contract_address: $contract_address, token_id: $token_id})
                MERGE (wallet)-[r:OWNS]->(nft)
                SET r.sketch_id = $sketch_id
                """
                self.neo4j_conn.query(owns_query, {
                    "wallet_address": nft.wallet.address,
                    "contract_address": nft.contract_address,
                    "token_id": nft.token_id,
                    "sketch_id": self.sketch_id
                })
                Logger.graph_append(self.sketch_id, {"message": f"Found NFT for {nft.wallet.address}: {nft.contract_address} - {nft.token_id}"})


        return results