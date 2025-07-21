import os
import socket
from typing import List, Dict, Any, Optional, TypeAlias, Union
from pydantic import TypeAdapter
import requests
from app.scanners.base import Scanner
from app.types.wallet import CryptoWallet, CryptoNFT
from app.utils import resolve_type
from app.core.logger import Logger
from app.core.graph_db import Neo4jConnection
InputType: TypeAlias = List[CryptoWallet]
OutputType: TypeAlias = List[CryptoNFT]

ETHERSCAN_API_URL = os.getenv("ETHERSCAN_API_URL")

class CryptoWalletAddressToNFTs(Scanner):
    """Resolve NFTs for a wallet address (ETH)."""
    def __init__(
            self,
            sketch_id: Optional[str] = None,
            scan_id: Optional[str] = None,
            neo4j_conn: Optional[Neo4jConnection] = None,
            vault=None,
            params: Optional[Dict[str, Any]] = None
        ):
            super().__init__(
                sketch_id=sketch_id,
                scan_id=scan_id,
                neo4j_conn=neo4j_conn,
                params_schema=self.get_params_schema(),
                vault=vault,
                params=params
            )

    @classmethod
    def requires_key(cls) -> bool:
        return True
    
    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this scanner"""
        return [
            {
                "name": "ETHERSCAN_API_KEY",
                "type": "vaultSecret",
                "description": "The Etherscan API key to use for the transaction lookup.",
                "required": True
            },
            {
                "name": "ETHERSCAN_API_URL",
                "type": "url",
                "description": "The Etherscan API URL to use for the transaction lookup.",
                "required": False,
                "default": ETHERSCAN_API_URL
            }
        ]
    
    @classmethod
    def name(cls) -> str:
        return "wallet_to_nfts"

    @classmethod
    def category(cls) -> str:
        return "CryptoWallet"
    
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
                wallet_obj = CryptoWallet(address=item)
            elif isinstance(item, dict) and "address" in item:
                wallet_obj = CryptoWallet(address=item["address"])
            elif isinstance(item, CryptoWallet):
                wallet_obj = item
            if wallet_obj:
                cleaned.append(wallet_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        results: OutputType = []
        params = self.get_params()
        Logger.warn(self.sketch_id, {"message": f"{str(params)}"})
        api_key = params["ETHERSCAN_API_KEY"]
        api_url = params["ETHERSCAN_API_URL"]
        if not api_key:
            Logger.error(self.sketch_id, {"message": "ETHERSCAN_API_KEY is required"})
            raise ValueError("ETHERSCAN_API_KEY is required")
        for d in data:
            try:
                nfts = self._get_nfts(d.address, api_key, api_url)
                results.append(nfts)
            except Exception as e:
                print(f"Error resolving nfts for {d.address}: {e}")
        return results
    
    def _get_nfts(self, address: str, api_key: str, api_url: str) -> List[CryptoNFT]:
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
        "apikey": api_key
    }
        response = requests.get(api_url, params=params)
        data = response.json()
        results = data["result"]
        for tx in results:
            nfts.append(CryptoNFT(
                wallet=CryptoWallet(address=address),
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