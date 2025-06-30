from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Breach(BaseModel):
    name: str = Field(..., description="The name of the breach or service")
    title: Optional[str] = Field(None, description="Title of the breach")
    domain: Optional[str] = Field(None, description="Domain of the breached service")
    breachdate: Optional[str] = Field(None, description="Date of the breach")
    addeddate: Optional[str] = Field(None, description="Date breach was added to HIBP")
    modifieddate: Optional[str] = Field(None, description="Date breach was last modified")
    pwncount: Optional[int] = Field(None, description="Number of accounts affected")
    description: Optional[str] = Field(None, description="Description of the breach")
    logopath: Optional[str] = Field(None, description="Logo path for the breach")
    dataclasses: Optional[List[str]] = Field(None, description="Types of data compromised")
    isverified: Optional[bool] = Field(None, description="Whether the breach is verified")
    isfabricated: Optional[bool] = Field(None, description="Whether the breach is fabricated")
    issensitive: Optional[bool] = Field(None, description="Whether the breach is sensitive")
    isretired: Optional[bool] = Field(None, description="Whether the breach is retired")
    isspamlist: Optional[bool] = Field(None, description="Whether the breach is a spam list")
    ismalware: Optional[bool] = Field(None, description="Whether the breach is related to malware")
    isstealerlog: Optional[bool] = Field(None, description="Whether the breach is a stealer log")
    issubscriptionfree: Optional[bool] = Field(None, description="Whether the breach is subscription free")
    breach: Optional[Dict] = Field(None, description="Full breach data as returned by the API") 