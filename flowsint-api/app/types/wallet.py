from typing import List, Optional
from pydantic import BaseModel, Field

class Wallet(BaseModel):
    """Represents a cryptocurrency wallet."""
    address: str = Field(..., description="Wallet address")
    node_id: Optional[str] = Field(None, description="Wallet Explorer node ID")

class WalletTransaction(BaseModel):
    """Represents a cryptocurrency transaction."""
    source: Wallet = Field(..., description="Source wallet")
    target: Optional[Wallet] = Field(None, description="Target wallet")
    hash: Optional[str] = Field(None, description="Transaction hash")
    value: Optional[float] = Field(None, description="Transaction value in cryptocurrency")
    amount: Optional[float] = Field(None, description="Transaction amount in cryptocurrency")
    amount_usd: Optional[float] = Field(None, description="Transaction amount in USD")
    date: Optional[str] = Field(None, description="Transaction date")
    hop: Optional[int] = Field(None, description="Hop distance from original wallet")
    timestamp: Optional[str] = Field(None, alias="timeStamp", description="Transaction timestamp (unix epoch)")
    block_number: Optional[int] = Field(None, alias="blockNumber", description="Block number")
    block_hash: Optional[str] = Field(None, alias="blockHash", description="Block hash")
    nonce: Optional[int] = Field(None, description="Transaction nonce")
    transaction_index: Optional[int] = Field(None, alias="transactionIndex", description="Transaction index in block")
    gas: Optional[int] = Field(None, description="Gas provided")
    gas_price: Optional[int] = Field(None, alias="gasPrice", description="Gas price in wei")
    gas_used: Optional[int] = Field(None, alias="gasUsed", description="Gas used")
    cumulative_gas_used: Optional[int] = Field(None, alias="cumulativeGasUsed", description="Cumulative gas used")
    input: Optional[str] = Field(None, description="Input data")
    contract_address: Optional[str] = Field(None, alias="contractAddress", description="Contract address")
    method_id: Optional[str] = Field(None, alias="methodId", description="Method ID")
    function_name: Optional[str] = Field(None, alias="functionName", description="Function name")
    confirmations: Optional[int] = Field(None, description="Number of confirmations")
    is_error: Optional[bool] = Field(None, alias="isError", description="Whether the transaction resulted in an error")
    txreceipt_status: Optional[str] = Field(None, alias="txreceipt_status", description="Transaction receipt status")
    error_message: Optional[str] = Field(None, description="Error message if transaction failed")

# Update forward references
Wallet.model_rebuild()
WalletTransaction.model_rebuild() 