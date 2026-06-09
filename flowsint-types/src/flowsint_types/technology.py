from typing import Optional, Self

from pydantic import Field, model_validator

from .flowsint_base import FlowsintType
from .registry import flowsint_type


@flowsint_type
class Technology(FlowsintType):
    """Represents a technology, framework, or software detected during recon."""

    name: str = Field(
        ...,
        description="Technology name (e.g. nginx, PHP, React)",
        title="Technology Name",
        json_schema_extra={"primary": True},
    )
    version: Optional[str] = Field(
        None, description="Detected version, if known", title="Version"
    )
    category: Optional[str] = Field(
        None,
        description="Technology category (e.g. web-server, framework, cms)",
        title="Category",
    )
    source: Optional[str] = Field(
        None,
        description="Tool or method that detected the technology (e.g. httpx)",
        title="Source",
    )

    @model_validator(mode="after")
    def compute_label(self) -> Self:
        if self.version:
            self.nodeLabel = f"{self.name} {self.version}"
        else:
            self.nodeLabel = self.name
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a technology from a raw string.

        Accepts either a bare name ("nginx") or a wappalyzer-style
        "name:version" pair ("PHP:8.1"), as emitted by httpx -td.
        """
        line = line.strip()
        if ":" in line:
            name, _, version = line.partition(":")
            return cls(name=name.strip(), version=version.strip() or None)
        return cls(name=line)

    @classmethod
    def detect(cls, line: str) -> bool:
        """Technology cannot be reliably detected from a single line of text."""
        return False
