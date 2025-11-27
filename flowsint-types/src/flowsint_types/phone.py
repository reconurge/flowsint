from pydantic import Field, field_validator, model_validator
from typing import Optional, Any, Self
import phonenumbers
from phonenumbers import NumberParseException
from .flowsint_base import FlowsintType


class Phone(FlowsintType):
    """Represents a phone number with country and carrier information."""

    number: str = Field(..., description="Phone number", title="Phone Number", json_schema_extra={"primary": True})
    country: Optional[str] = Field(
        None, description="Country code (ISO 3166-1 alpha-2)", title="Country Code"
    )
    carrier: Optional[str] = Field(
        None, description="Mobile carrier or service provider", title="Carrier"
    )

    @model_validator(mode='before')
    @classmethod
    def convert_string_to_dict(cls, data: Any) -> Any:
        """Allow creating Phone from a string directly."""
        if isinstance(data, str):
            return {'number': data}
        return data

    @field_validator('number')
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        """Validate phone number format using phonenumbers library.

        Tries to parse the number in multiple ways:
        1. As international format (with + prefix)
        2. With common region codes (US, GB, FR, etc.)
        """
        # If it looks like an international number (starts with +), try parsing without region
        if v.startswith('+'):
            try:
                parsed = phonenumbers.parse(v, None)
                if phonenumbers.is_valid_number(parsed):
                    return v
            except NumberParseException:
                pass

        # Try parsing with common regions
        common_regions = ['US', 'GB', 'FR', 'DE', 'ES', 'IT', 'CA', 'AU', 'JP', 'CN']
        for region in common_regions:
            try:
                parsed = phonenumbers.parse(v, region)
                if phonenumbers.is_valid_number(parsed):
                    # Return the number in international format
                    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except NumberParseException:
                continue

        # If all attempts fail, raise an error
        raise ValueError(f"Invalid phone number: {v}. Must be in international format (+...) or a valid format for common regions.")

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.label = self.number
        return self
