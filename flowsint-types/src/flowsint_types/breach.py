from typing import List, Optional, Dict, Self
from pydantic import Field, model_validator
from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Breach(FlowsintType):
    """Represents a data breach incident with affected accounts and details."""

    name: str = Field(
        ..., description="The name of the breach or service", title="Breach Name", json_schema_extra={"primary": True}
    )
    title: Optional[str] = Field(
        None, description="Title of the breach", title="Breach Title"
    )
    domain: Optional[str] = Field(
        None, description="Domain of the breached service", title="Domain"
    )
    breachdate: Optional[str] = Field(
        None, description="Date of the breach", title="Breach Date"
    )
    addeddate: Optional[str] = Field(
        None, description="Date breach was added to HIBP", title="Added Date"
    )
    modifieddate: Optional[str] = Field(
        None, description="Date breach was last modified", title="Modified Date"
    )
    pwncount: Optional[int] = Field(
        None, description="Number of accounts affected", title="Affected Accounts"
    )
    description: Optional[str] = Field(
        None, description="Description of the breach", title="Description"
    )
    logopath: Optional[str] = Field(
        None, description="Logo path for the breach", title="Logo Path"
    )
    dataclasses: Optional[List[str]] = Field(
        None, description="Types of data compromised", title="Data Classes"
    )
    isverified: Optional[bool] = Field(
        None, description="Whether the breach is verified", title="Is Verified"
    )
    isfabricated: Optional[bool] = Field(
        None, description="Whether the breach is fabricated", title="Is Fabricated"
    )
    issensitive: Optional[bool] = Field(
        None, description="Whether the breach is sensitive", title="Is Sensitive"
    )
    isretired: Optional[bool] = Field(
        None, description="Whether the breach is retired", title="Is Retired"
    )
    isspamlist: Optional[bool] = Field(
        None, description="Whether the breach is a spam list", title="Is Spam List"
    )
    ismalware: Optional[bool] = Field(
        None, description="Whether the breach is related to malware", title="Is Malware"
    )
    isstealerlog: Optional[bool] = Field(
        None, description="Whether the breach is a stealer log", title="Is Stealer Log"
    )
    issubscriptionfree: Optional[bool] = Field(
        None,
        description="Whether the breach is subscription free",
        title="Is Subscription Free",
    )
    breach: Optional[Dict] = Field(
        None,
        description="Full breach data as returned by the API",
        title="Full Breach Data",
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        # Use title if available, otherwise name
        if self.title:
            self.label = self.title
        else:
            self.label = self.name
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a breach from a raw string."""
        return cls(name=line.strip())

    @classmethod
    def detect(cls, line: str) -> bool:
        """Breach cannot be reliably detected from a single line of text."""
        return False
