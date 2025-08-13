from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class CryptoWallet(BaseModel):
    """Represents a cryptocurrency wallet."""

    address: str = Field(..., description="Wallet address", title="Wallet Address")
    node_id: Optional[str] = Field(
        None, description="Wallet Explorer node ID", title="Node ID"
    )


class CryptoWalletTransaction(BaseModel):
    """Represents a cryptocurrency transaction."""

    source: CryptoWallet = Field(
        ..., description="Source wallet", title="Source Wallet"
    )
    target: Optional[CryptoWallet] = Field(
        None, description="Target wallet", title="Target Wallet"
    )
    hash: Optional[str] = Field(
        None, description="Transaction hash", title="Transaction Hash"
    )
    value: Optional[float] = Field(
        None, description="Transaction value in cryptocurrency", title="Value"
    )
    amount: Optional[float] = Field(
        None, description="Transaction amount in cryptocurrency", title="Amount"
    )
    amount_usd: Optional[float] = Field(
        None, description="Transaction amount in USD", title="Amount USD"
    )
    date: Optional[str] = Field(None, description="Transaction date", title="Date")
    hop: Optional[int] = Field(
        None, description="Hop distance from original wallet", title="Hop Distance"
    )
    timestamp: Optional[str] = Field(
        None, description="Transaction timestamp (unix epoch)", title="Timestamp"
    )
    block_number: Optional[int] = Field(
        None, description="Block number", title="Block Number"
    )
    block_hash: Optional[str] = Field(
        None, description="Block hash", title="Block Hash"
    )
    nonce: Optional[int] = Field(None, description="Transaction nonce", title="Nonce")
    transaction_index: Optional[int] = Field(
        None, description="Transaction index in block", title="Transaction Index"
    )
    gas: Optional[int] = Field(None, description="Gas provided", title="Gas")
    gas_price: Optional[int] = Field(
        None, description="Gas price in wei", title="Gas Price"
    )
    gas_used: Optional[int] = Field(None, description="Gas used", title="Gas Used")
    cumulative_gas_used: Optional[int] = Field(
        None, description="Cumulative gas used", title="Cumulative Gas Used"
    )
    input: Optional[str] = Field(None, description="Input data", title="Input Data")
    contract_address: Optional[str] = Field(
        None, description="Contract address", title="Contract Address"
    )
    method_id: Optional[str] = Field(None, description="Method ID", title="Method ID")
    function_name: Optional[str] = Field(
        None, description="Function name", title="Function Name"
    )
    confirmations: Optional[int] = Field(
        None, description="Number of confirmations", title="Confirmations"
    )
    is_error: Optional[bool] = Field(
        None,
        description="Whether the transaction resulted in an error",
        title="Is Error",
    )
    txreceipt_status: Optional[str] = Field(
        None,
        description="Transaction receipt status",
        title="Transaction Receipt Status",
    )
    error_message: Optional[str] = Field(
        None, description="Error message if transaction failed", title="Error Message"
    )


class CryptoNFT(BaseModel):
    """Represents a Non-Fungible Token (NFT) held or minted by a wallet."""

    wallet: CryptoWallet = Field(..., description="Source wallet", title="Wallet")
    contract_address: str = Field(
        ...,
        description="Address of the NFT smart contract (ERC-721/1155)",
        title="Contract Address",
    )
    token_id: str = Field(
        ...,
        description="Unique token ID of the NFT within the contract",
        title="Token ID",
    )
    collection_name: Optional[str] = Field(
        None, description="Name of the NFT collection", title="Collection Name"
    )
    metadata_url: Optional[HttpUrl] = Field(
        None,
        description="URL to the metadata JSON or IPFS resource",
        title="Metadata URL",
    )
    image_url: Optional[HttpUrl] = Field(
        None,
        description="URL to the image or media representing the NFT",
        title="Image URL",
    )
    name: Optional[str] = Field(
        None, description="Name or title of the NFT", title="NFT Name"
    )
    description: Optional[str] = Field(
        None, description="Text description of the NFT", title="Description"
    )
    owner_address: Optional[str] = Field(
        None, description="Current owner of the NFT", title="Owner Address"
    )
    creator_address: Optional[str] = Field(
        None, description="Original minter or creator address", title="Creator Address"
    )
    last_transfer_date: Optional[str] = Field(
        None,
        description="Date of last transfer or update (ISO format)",
        title="Last Transfer Date",
    )
    node_id: Optional[str] = Field(
        None, description="NFT node ID in the Explorer graph", title="Node ID"
    )

    @property
    def uid(self):
        return f"{self.contract_address}:{self.token_id}"


# Update forward references
CryptoWallet.model_rebuild()
CryptoWalletTransaction.model_rebuild()
CryptoNFT.model_rebuild()
