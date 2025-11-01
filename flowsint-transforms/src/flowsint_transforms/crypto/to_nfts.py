import os
from typing import List, Dict, Any, Optional, Union
import requests
from flowsint_core.core.transform_base import Transform
from flowsint_types.wallet import CryptoWallet, CryptoNFT
from flowsint_core.core.logger import Logger
from flowsint_core.core.graph_db import Neo4jConnection
from dotenv import load_dotenv

load_dotenv()


class CryptoWalletAddressToNFTs(Transform):
    """[ETHERSCAN] Resolve NFTs for a wallet address (ETH)."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[CryptoWallet]
    OutputType = List[CryptoNFT]

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def icon(cls) -> str | None:
        return "cryptowallet"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this transform"""
        return [
            {
                "name": "ETHERSCAN_API_KEY",
                "type": "vaultSecret",
                "description": "The Etherscan API key to use for the NFT lookup.",
                "required": True,
            },
            {
                "name": "ETHERSCAN_API_URL",
                "type": "url",
                "description": "The Etherscan API URL to use for the NFT lookup.",
                "required": False,
                "default": "https://api.etherscan.io/v2/api",
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "cryptowallet_to_nfts"

    @classmethod
    def category(cls) -> str:
        return "CryptoWallet"

    @classmethod
    def key(cls) -> str:
        return "address"

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
        api_key = self.get_secret("ETHERSCAN_API_KEY", os.getenv("ETHERSCAN_API_KEY"))
        api_url = self.get_params().get("ETHERSCAN_API_URL", "https://api.etherscan.io/v2/api")
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
            "apikey": api_key,
        }
        response = requests.get(api_url, params=params)
        data = response.json()
        results = data["result"]
        for tx in results:
            nfts.append(
                CryptoNFT(
                    wallet=CryptoWallet(address=address),
                    contract_address=tx["contractAddress"],
                    token_id=tx["tokenID"],
                    collection_name=tx["collectionName"],
                    metadata_url=tx["metadataURL"],
                    image_url=tx["imageURL"],
                    name=tx["name"],
                )
            )
        return nfts

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for nfts in results:
            for nft in nfts:
                # Create or update wallet node
                self.create_node(
                    "cryptowallet",
                    "wallet",
                    nft.wallet.address,
                    caption=nft.wallet.address,
                    type="cryptowallet",
                )

                # Create or update NFT node
                nft_key = f"{nft.contract_address}_{nft.token_id}"
                self.create_node(
                    "nft",
                    "nft_id",
                    nft_key,
                    contract_address=nft.contract_address,
                    token_id=nft.token_id,
                    collection_name=nft.collection_name,
                    metadata_url=nft.metadata_url,
                    image_url=nft.image_url,
                    name=nft.name,
                    caption=nft.name,
                    type="nft",
                )

                # Create relationship from wallet to NFT
                self.create_relationship(
                    "cryptowallet",
                    "wallet",
                    nft.wallet.address,
                    "nft",
                    "nft_id",
                    nft_key,
                    "OWNS",
                )
                self.log_graph_message(
                    f"Found NFT for {nft.wallet.address}: {nft.contract_address} - {nft.token_id}"
                )

        return results


# Make types available at module level for easy access
InputType = CryptoWalletAddressToNFTs.InputType
OutputType = CryptoWalletAddressToNFTs.OutputType
