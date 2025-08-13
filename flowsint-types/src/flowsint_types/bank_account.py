from pydantic import BaseModel, Field
from typing import Optional, List


class BankAccount(BaseModel):
    """Represents a bank account with financial and security information."""

    account_number: str = Field(
        ..., description="Bank account number", title="Account Number"
    )
    bank_name: Optional[str] = Field(None, description="Bank name", title="Bank Name")
    account_type: Optional[str] = Field(
        None,
        description="Type of account (checking, savings, etc.)",
        title="Account Type",
    )
    routing_number: Optional[str] = Field(
        None, description="Bank routing number", title="Routing Number"
    )
    iban: Optional[str] = Field(
        None, description="International Bank Account Number", title="IBAN"
    )
    swift_code: Optional[str] = Field(
        None, description="SWIFT/BIC code", title="SWIFT Code"
    )
    country: Optional[str] = Field(
        None, description="Country where account is held", title="Country"
    )
    currency: Optional[str] = Field(
        None, description="Account currency", title="Currency"
    )
    balance: Optional[float] = Field(
        None, description="Account balance", title="Balance"
    )
    account_holder: Optional[str] = Field(
        None, description="Account holder name", title="Account Holder"
    )
    status: Optional[str] = Field(
        None, description="Account status (active, closed, etc.)", title="Status"
    )
    opened_date: Optional[str] = Field(
        None, description="Account opening date", title="Opened Date"
    )
    closed_date: Optional[str] = Field(
        None, description="Account closing date", title="Closed Date"
    )
    is_joint: Optional[bool] = Field(
        None, description="Whether account is joint", title="Is Joint"
    )
    associated_individuals: Optional[List[str]] = Field(
        None,
        description="Individuals associated with account",
        title="Associated Individuals",
    )
    source: Optional[str] = Field(
        None, description="Source of account information", title="Source"
    )
    is_compromised: Optional[bool] = Field(
        None, description="Whether account has been compromised", title="Is Compromised"
    )
    breach_source: Optional[str] = Field(
        None, description="Source of breach if compromised", title="Breach Source"
    )
