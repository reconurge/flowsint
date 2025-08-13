from pydantic import BaseModel, Field
from typing import Optional, List


class CreditCard(BaseModel):
    """Represents a credit card with financial details and security status."""

    card_number: str = Field(..., description="Credit card number", title="Card Number")
    card_type: Optional[str] = Field(
        None, description="Type of card (Visa, Mastercard, etc.)", title="Card Type"
    )
    issuer: Optional[str] = Field(None, description="Card issuer bank", title="Issuer")
    expiry_date: Optional[str] = Field(
        None, description="Card expiry date", title="Expiry Date"
    )
    cvv: Optional[str] = Field(None, description="Card verification value", title="CVV")
    cardholder_name: Optional[str] = Field(
        None, description="Cardholder name", title="Cardholder Name"
    )
    billing_address: Optional[str] = Field(
        None, description="Billing address", title="Billing Address"
    )
    credit_limit: Optional[float] = Field(
        None, description="Credit limit", title="Credit Limit"
    )
    available_credit: Optional[float] = Field(
        None, description="Available credit", title="Available Credit"
    )
    status: Optional[str] = Field(
        None, description="Card status (active, suspended, etc.)", title="Status"
    )
    issued_date: Optional[str] = Field(
        None, description="Card issue date", title="Issued Date"
    )
    is_virtual: Optional[bool] = Field(
        None, description="Whether card is virtual", title="Is Virtual"
    )
    is_prepaid: Optional[bool] = Field(
        None, description="Whether card is prepaid", title="Is Prepaid"
    )
    is_business: Optional[bool] = Field(
        None, description="Whether card is business card", title="Is Business"
    )
    associated_accounts: Optional[List[str]] = Field(
        None, description="Associated bank accounts", title="Associated Accounts"
    )
    source: Optional[str] = Field(
        None, description="Source of card information", title="Source"
    )
    is_compromised: Optional[bool] = Field(
        None, description="Whether card has been compromised", title="Is Compromised"
    )
    breach_source: Optional[str] = Field(
        None, description="Source of breach if compromised", title="Breach Source"
    )
    last_used: Optional[str] = Field(
        None, description="Last time card was used", title="Last Used"
    )
