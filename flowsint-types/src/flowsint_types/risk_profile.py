from pydantic import Field, model_validator
from typing import Optional, List, Self

from .flowsint_base import FlowsintType


class RiskProfile(FlowsintType):
    """Represents a comprehensive risk assessment profile for an entity."""

    entity_id: str = Field(..., description="Entity identifier", title="Entity ID", json_schema_extra={"primary": True})
    entity_type: Optional[str] = Field(
        None, description="Type of entity", title="Entity Type"
    )
    overall_risk_score: Optional[float] = Field(
        None, description="Overall risk score (0-100)", title="Overall Risk Score"
    )
    risk_level: Optional[str] = Field(
        None, description="Risk level (low, medium, high, critical)", title="Risk Level"
    )
    assessment_date: Optional[str] = Field(
        None, description="Date of risk assessment", title="Assessment Date"
    )
    last_updated: Optional[str] = Field(
        None, description="Last update timestamp", title="Last Updated"
    )
    risk_factors: Optional[List[str]] = Field(
        None, description="Identified risk factors", title="Risk Factors"
    )
    threat_actors: Optional[List[str]] = Field(
        None, description="Associated threat actors", title="Threat Actors"
    )
    attack_vectors: Optional[List[str]] = Field(
        None, description="Potential attack vectors", title="Attack Vectors"
    )
    vulnerabilities: Optional[List[str]] = Field(
        None, description="Identified vulnerabilities", title="Vulnerabilities"
    )
    exposure_surface: Optional[str] = Field(
        None, description="Exposure surface description", title="Exposure Surface"
    )
    data_classification: Optional[str] = Field(
        None, description="Data classification level", title="Data Classification"
    )
    compliance_risks: Optional[List[str]] = Field(
        None, description="Compliance-related risks", title="Compliance Risks"
    )
    financial_impact: Optional[str] = Field(
        None, description="Potential financial impact", title="Financial Impact"
    )
    reputation_impact: Optional[str] = Field(
        None, description="Potential reputation impact", title="Reputation Impact"
    )
    operational_impact: Optional[str] = Field(
        None, description="Potential operational impact", title="Operational Impact"
    )
    mitigation_strategies: Optional[List[str]] = Field(
        None,
        description="Recommended mitigation strategies",
        title="Mitigation Strategies",
    )
    monitoring_recommendations: Optional[List[str]] = Field(
        None,
        description="Monitoring recommendations",
        title="Monitoring Recommendations",
    )
    source: Optional[str] = Field(
        None, description="Source of risk assessment", title="Source"
    )
    assessor: Optional[str] = Field(None, description="Risk assessor", title="Assessor")
    confidence: Optional[float] = Field(
        None, description="Confidence in assessment", title="Confidence"
    )
    next_review_date: Optional[str] = Field(
        None, description="Next review date", title="Next Review Date"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        parts = [self.entity_id]
        if self.risk_level:
            parts.append(f"Risk: {self.risk_level}")
        self.label = " - ".join(parts)
        return self
