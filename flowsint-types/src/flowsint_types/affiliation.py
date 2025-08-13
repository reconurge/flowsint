from pydantic import BaseModel, Field
from typing import Optional, List


class Affiliation(BaseModel):
    """Represents an organizational affiliation or employment relationship."""

    organization: str = Field(
        ..., description="Organization or group name", title="Organization"
    )
    role: Optional[str] = Field(
        None, description="Role or position within organization", title="Role"
    )
    start_date: Optional[str] = Field(
        None, description="Start date of affiliation", title="Start Date"
    )
    end_date: Optional[str] = Field(
        None, description="End date of affiliation", title="End Date"
    )
    is_current: Optional[bool] = Field(
        None, description="Whether affiliation is currently active", title="Is Current"
    )
    department: Optional[str] = Field(
        None, description="Department or division", title="Department"
    )
    location: Optional[str] = Field(
        None, description="Geographic location of affiliation", title="Location"
    )
    industry: Optional[str] = Field(
        None, description="Industry or sector", title="Industry"
    )
    description: Optional[str] = Field(
        None, description="Description of affiliation", title="Description"
    )
    source: Optional[str] = Field(
        None, description="Source of affiliation information", title="Source"
    )
    confidence: Optional[float] = Field(
        None, description="Confidence score for affiliation", title="Confidence"
    )
    associated_individuals: Optional[List[str]] = Field(
        None,
        description="Individuals with similar affiliations",
        title="Associated Individuals",
    )
    organization_type: Optional[str] = Field(
        None,
        description="Type of organization (company, NGO, government, etc.)",
        title="Organization Type",
    )
    hierarchy_level: Optional[str] = Field(
        None,
        description="Hierarchical level within organization",
        title="Hierarchy Level",
    )
