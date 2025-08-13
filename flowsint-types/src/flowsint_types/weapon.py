from pydantic import BaseModel, Field
from typing import Literal, Optional, List


class Weapon(BaseModel):
    """Represents a weapon with detailed specifications and forensic information."""

    name: str = Field(..., description="Weapon name or identifier", title="Name")
    type: Optional[
        Literal[
            "firearm",
            "melee",
            "explosive",
            "bladed",
            "blunt",
            "chemical",
            "biological",
            "radiological",
            "nuclear",
            "other",
        ]
    ] = Field(
        None,
        description="Weapon category (handgun, rifle, shotgun, knife, etc.)",
        title="Category",
    )
    description: Optional[str] = Field(
        None, description="Weapon description", title="Description"
    )
    manufacturer: Optional[str] = Field(
        None, description="Weapon manufacturer", title="Manufacturer"
    )
    model: Optional[str] = Field(None, description="Weapon model", title="Model")
    caliber: Optional[str] = Field(
        None, description="Caliber or ammunition type", title="Caliber"
    )
    serial_number: Optional[str] = Field(
        None, description="Weapon serial number", title="Serial Number"
    )
    year_manufactured: Optional[int] = Field(
        None, description="Year weapon was manufactured", title="Year Manufactured"
    )
    country_of_origin: Optional[str] = Field(
        None,
        description="Country where weapon was manufactured",
        title="Country of Origin",
    )
    legal_status: Optional[str] = Field(
        None,
        description="Legal status (legal, illegal, restricted, etc.)",
        title="Legal Status",
    )
    registration_status: Optional[str] = Field(
        None, description="Registration status", title="Registration Status"
    )
    condition: Optional[str] = Field(
        None, description="Physical condition of the weapon", title="Condition"
    )
    modifications: Optional[List[str]] = Field(
        None, description="Any modifications made to the weapon", title="Modifications"
    )
    accessories: Optional[List[str]] = Field(
        None, description="Attached accessories", title="Accessories"
    )
    capacity: Optional[str] = Field(
        None, description="Magazine capacity or ammunition capacity", title="Capacity"
    )
    barrel_length: Optional[str] = Field(
        None, description="Barrel length", title="Barrel Length"
    )
    overall_length: Optional[str] = Field(
        None, description="Overall weapon length", title="Overall Length"
    )
    weight: Optional[str] = Field(None, description="Weapon weight", title="Weight")
    action_type: Optional[str] = Field(
        None,
        description="Action type (semi-automatic, bolt-action, etc.)",
        title="Action Type",
    )
    firing_mode: Optional[str] = Field(
        None,
        description="Firing mode (single shot, burst, full auto, etc.)",
        title="Firing Mode",
    )
    safety_features: Optional[List[str]] = Field(
        None, description="Safety features present", title="Safety Features"
    )
    source: Optional[str] = Field(
        None, description="Source of weapon information", title="Source"
    )
    location_found: Optional[str] = Field(
        None, description="Location where weapon was found", title="Location Found"
    )
    date_found: Optional[str] = Field(
        None, description="Date weapon was found", title="Date Found"
    )
    evidence_number: Optional[str] = Field(
        None, description="Evidence number or case reference", title="Evidence Number"
    )
    owner: Optional[str] = Field(
        None, description="Registered owner or possessor", title="Owner"
    )
    purchase_date: Optional[str] = Field(
        None, description="Date weapon was purchased", title="Purchase Date"
    )
    purchase_location: Optional[str] = Field(
        None,
        description="Location where weapon was purchased",
        title="Purchase Location",
    )
    price: Optional[float] = Field(None, description="Purchase price", title="Price")
    notes: Optional[str] = Field(
        None, description="Additional notes or observations", title="Notes"
    )
