import re
from typing import Optional, Self

from pydantic import Field, HttpUrl, field_validator, model_validator

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class CryptoWallet(FlowsintType):
    """Represents a cryptocurrency wallet."""

    address: str = Field(
        ...,
        description="Wallet address",
        title="Wallet Address",
        json_schema_extra={"primary": True},
    )
    node_id: Optional[str] = Field(
        None, description="Wallet Explorer node ID", title="Node ID"
    )

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """Validate that the wallet address is not empty and has a valid format."""
        if not v or not v.strip():
            raise ValueError("Wallet address cannot be empty")

        # Strip whitespace
        v = v.strip()

        # Basic validation: check if it looks like a valid crypto address
        # Ethereum addresses start with 0x and are 42 characters (0x + 40 hex chars)
        # Bitcoin addresses vary but are typically 26-35 characters
        # We'll do a permissive check for common formats
        # if len(v) < 26:
        #     raise ValueError("Wallet address is too short to be valid")

        # # Check for common patterns
        # ethereum_pattern = r'^0x[a-fA-F0-9]{40}$'
        # bitcoin_pattern = r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$'

        # # If it matches Ethereum pattern, validate it
        # if v.startswith('0x'):
        #     if not re.match(ethereum_pattern, v):
        #         raise ValueError("Invalid Ethereum address format")

        return v

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        self.nodeLabel = self.address
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a crypto wallet from a raw string."""
        return cls(address=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a cryptocurrency wallet address."""
        line = line.strip()
        if not line or len(line) < 26:
            return False

        # Ethereum pattern: 0x followed by 40 hex characters
        ethereum_pattern = r"^0x[a-fA-F0-9]{40}$"
        if re.match(ethereum_pattern, line):
            return True

        # Bitcoin legacy pattern: starts with 1 or 3, 26-35 characters
        bitcoin_legacy_pattern = r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$"
        if re.match(bitcoin_legacy_pattern, line):
            return True

        # Bitcoin SegWit pattern: starts with bc1, 39-59 characters
        bitcoin_segwit_pattern = r"^bc1[a-z0-9]{39,59}$"
        if re.match(bitcoin_segwit_pattern, line):
            return True

        return False


@flowsint_type
class CryptoWalletTransaction(FlowsintType):
    """Represents a cryptocurrency transaction."""

    source: CryptoWallet = Field(
        ..., description="Source wallet", title="Source Wallet"
    )
    target: Optional[CryptoWallet] = Field(
        None, description="Target wallet", title="Target Wallet"
    )
    hash: Optional[str] = Field(
        None,
        description="Transaction hash",
        title="Transaction Hash",
        json_schema_extra={"primary": True},
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

    @field_validator("value", "amount", "amount_usd")
    @classmethod
    def validate_positive_amounts(cls, v: Optional[float]) -> Optional[float]:
        """Validate that monetary amounts are non-negative."""
        if v is not None and v < 0:
            raise ValueError("Monetary amounts must be non-negative")
        return v

    @field_validator(
        "gas",
        "gas_price",
        "gas_used",
        "cumulative_gas_used",
        "block_number",
        "nonce",
        "transaction_index",
        "confirmations",
        "hop",
    )
    @classmethod
    def validate_non_negative_integers(cls, v: Optional[int]) -> Optional[int]:
        """Validate that integer fields are non-negative."""
        if v is not None and v < 0:
            raise ValueError("Integer values must be non-negative")
        return v

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        # Use hash if available, otherwise create a descriptive label
        if self.hash:
            self.nodeLabel = self.hash
        elif self.source and self.target:
            self.nodeLabel = f"Transaction from {self.source.address[:8]}... to {self.target.address[:8]}..."
        elif self.source:
            self.nodeLabel = f"Transaction from {self.source.address[:8]}..."
        return self


@flowsint_type
class CryptoNFT(FlowsintType):
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
        json_schema_extra={"primary": True},
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

    @field_validator("contract_address")
    @classmethod
    def validate_contract_address(cls, v: str) -> str:
        """Validate that the NFT contract address has a valid format."""
        if not v or not v.strip():
            raise ValueError("Contract address cannot be empty")

        v = v.strip()

        # NFT contracts are typically on Ethereum, so validate as Ethereum address
        ethereum_pattern = r"^0x[a-fA-F0-9]{40}$"
        if not re.match(ethereum_pattern, v):
            raise ValueError(
                "Invalid contract address format (expected Ethereum address: 0x followed by 40 hex characters)"
            )

        return v

    @field_validator("token_id")
    @classmethod
    def validate_token_id(cls, v: str) -> str:
        """Validate that the token ID is not empty."""
        if not v or not v.strip():
            raise ValueError("Token ID cannot be empty")
        return v.strip()

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        # Prefer name, then collection_name with token_id, fallback to uid
        if self.name:
            self.nodeLabel = self.name
        elif self.collection_name:
            self.nodeLabel = f"{self.collection_name} #{self.token_id}"
        else:
            self.nodeLabel = self.uid
        return self


# Update forward references
CryptoWallet.model_rebuild()
CryptoWalletTransaction.model_rebuild()
CryptoNFT.model_rebuild()
