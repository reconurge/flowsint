import os
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
import requests
from datetime import datetime
from app.scanners.base import Scanner
from app.types.wallet import Wallet, WalletTransaction
from app.utils import resolve_type
from app.core.logger import Logger
InputType: TypeAlias = List[Wallet]
OutputType: TypeAlias = List[WalletTransaction]

ETHERSCAN_API_URL = os.getenv("ETHERSCAN_API_URL")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")

def wei_to_eth(wei_str):
    return int(wei_str) / 10**18

class WalletAddressToTransactions(Scanner):
    """Resolve transactions for a wallet address (ETH)."""

    @classmethod
    def name(cls) -> str:
        return "wallet_to_transactions"

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
                transactions = self._get_transactions(d.address)
                results.append(transactions)
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error resolving transactions for {d.address}: {e}"})
        return results
    
    def _get_transactions(self, address: str) -> List[WalletTransaction]:
        transactions = []
        """Get transactions for a wallet address."""
        params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 100,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY
    }
        response = requests.get(ETHERSCAN_API_URL, params=params)
        data = response.json()
        results = data["result"]
        for tx in results:
            if tx["to"] !=None:
                target = Wallet(address=tx["to"])
            else:
                target = Wallet(address=tx["contractAddress"])
            transactions.append(WalletTransaction(
                source=Wallet(address=address),
                target=target,
                hash=tx["hash"],
                value=wei_to_eth(tx["value"]),
                timestamp=tx["timeStamp"],
                block_number=tx["blockNumber"],
                block_hash=tx["blockHash"],
                nonce=tx["nonce"],
                transaction_index=tx["transactionIndex"],
                gas=tx["gas"],
                gas_price=tx["gasPrice"],
                gas_used=tx["gasUsed"],
                cumulative_gas_used=tx["cumulativeGasUsed"],
                input=tx["input"],
                contract_address=tx["contractAddress"],
            ))
        return transactions
        

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for transactions in results:
            for tx in transactions:
                # Create or update both wallet nodes in a single operation
                wallets_query = """
                MERGE (source:cryptowallet {wallet: $source_address})
                MERGE (target:cryptowallet {wallet: $target_address})
                SET source.sketch_id = $sketch_id,
                    source.label = $source_address,
                    source.caption = $source_address,
                    source.type = "cryptowallet"
                """
                self.neo4j_conn.query(wallets_query, {
                    "source_address": tx.source.address,
                    "target_address": tx.target.address,
                    "sketch_id": self.sketch_id
                })

                # Create transaction as an edge between wallets
                tx_query = """
                MATCH (source:cryptowallet {cryptowallet: $source})
                MATCH (target:cryptowallet {cryptowallet: $target})
                MERGE (source)-[tx:TRANSACTION {hash: $hash}]->(target)
                SET tx.value = $value,
                    tx.timestamp = $timestamp,
                    tx.block_number = $block_number,
                    tx.block_hash = $block_hash,
                    tx.nonce = $nonce,
                    tx.transaction_index = $transaction_index,
                    tx.gas = $gas,
                    tx.gas_price = $gas_price,
                    tx.gas_used = $gas_used,
                    tx.cumulative_gas_used = $cumulative_gas_used,
                    tx.input = $input,
                    tx.contract_address = $contract_address,
                    tx.sketch_id = $sketch_id,
                    tx.label = $hash,
                    tx.caption = $hash,
                    tx.type = "transaction"
                """
                self.neo4j_conn.query(tx_query, {
                    "hash": tx.hash,
                    "source": tx.source.address,
                    "target": tx.target.address,
                    "value": tx.value,
                    "timestamp": tx.timestamp,
                    "block_number": tx.block_number,
                    "block_hash": tx.block_hash,
                    "nonce": tx.nonce,
                    "transaction_index": tx.transaction_index,
                    "gas": tx.gas,
                    "gas_price": tx.gas_price,
                    "gas_used": tx.gas_used,
                    "cumulative_gas_used": tx.cumulative_gas_used,
                    "input": tx.input,
                    "contract_address": tx.contract_address,
                    "sketch_id": self.sketch_id
                })
                Logger.graph_append(self.sketch_id, {"message": f"Transaction on {datetime.fromtimestamp(int(tx.timestamp)).strftime('%Y-%m-%d %H:%M:%S') if tx.timestamp else 'Unknown time'}: {tx.source.address} -> {tx.target.address}"})

        return results