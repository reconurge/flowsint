from pydantic import Field, model_validator
from typing import Optional, List, Self

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class CreditCard(FlowsintType):
    """Represents a credit card with financial details and security status."""

    card_number: str = Field(..., description="Credit card number", title="Card Number", json_schema_extra={"primary": True})
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

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        parts = []
        if self.card_type:
            parts.append(self.card_type)
        parts.append(f"****{self.card_number[-4:]}" if len(self.card_number) > 4 else self.card_number)
        self.label = " ".join(parts)
        return self

    @classmethod
    def _luhn_check(cls, card_number: str) -> bool:
        """Validate a credit card number using the Luhn algorithm."""
        def digits_of(n):
            return [int(d) for d in str(n)]

        digits = digits_of(card_number)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        return checksum % 10 == 0

    @classmethod
    def from_string(cls, line: str):
        """Parse a credit card from a raw string."""
        return cls(card_number=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect if a line of text contains a credit card number."""
        line = line.strip().replace(' ', '').replace('-', '')
        if not line or not line.isdigit():
            return False

        # Credit card numbers are typically 13-19 digits
        if len(line) < 13 or len(line) > 19:
            return False

        # Use Luhn algorithm to validate
        return cls._luhn_check(line)
