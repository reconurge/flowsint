from pydantic import BaseModel, Field
from typing import Optional, List


class ReputationScore(BaseModel):
    """Represents a reputation score for an entity with historical data and trends."""

    entity_id: str = Field(..., description="Entity identifier", title="Entity ID")
    entity_type: Optional[str] = Field(
        None,
        description="Type of entity (domain, IP, email, etc.)",
        title="Entity Type",
    )
    score: Optional[float] = Field(
        None, description="Reputation score (0-100)", title="Score"
    )
    score_type: Optional[str] = Field(
        None,
        description="Type of score (trust, spam, malware, etc.)",
        title="Score Type",
    )
    provider: Optional[str] = Field(
        None, description="Reputation provider", title="Provider"
    )
    last_updated: Optional[str] = Field(
        None, description="Last update timestamp", title="Last Updated"
    )
    confidence: Optional[float] = Field(
        None, description="Confidence in the score", title="Confidence"
    )
    factors: Optional[List[str]] = Field(
        None, description="Factors contributing to score", title="Factors"
    )
    category: Optional[str] = Field(
        None,
        description="Category (good, suspicious, malicious, etc.)",
        title="Category",
    )
    description: Optional[str] = Field(
        None, description="Description of reputation", title="Description"
    )
    source: Optional[str] = Field(
        None, description="Source of reputation data", title="Source"
    )
    historical_scores: Optional[List[dict]] = Field(
        None, description="Historical score data", title="Historical Scores"
    )
    trend: Optional[str] = Field(
        None, description="Score trend (improving, declining, stable)", title="Trend"
    )
    risk_level: Optional[str] = Field(
        None, description="Risk level assessment", title="Risk Level"
    )
    recommendations: Optional[List[str]] = Field(
        None, description="Recommendations based on score", title="Recommendations"
    )
