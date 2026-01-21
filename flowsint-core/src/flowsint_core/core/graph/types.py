"""
Graph-related type definitions.

This module contains Pydantic models for graph nodes, edges, and related data structures.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from flowsint_types import FlowsintType
from pydantic import BaseModel, Field

Neo4jDict = Dict[str, Any]


class NodeMetadata(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        extra = "allow"


class GraphNode(BaseModel):
    """
    Represents object that's being manipulated in the frontend, and throughout the app.
    It represents a complete node object, close to what is stored in the neo4j db.
    """

    id: Optional[str]
    nodeLabel: str
    nodeType: str
    nodeSize: Optional[int] = None
    nodeColor: Optional[str] = None
    nodeIcon: Optional[str] = None
    nodeImage: Optional[str] = None
    nodeFlag: Optional[str] = None

    nodeMetadata: NodeMetadata
    nodeProperties: FlowsintType

    x: Optional[float] = 100.0
    y: Optional[float] = 100.0


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    date: Optional[str] = None
    caption: Optional[str] = None
    type: Optional[str] = None
    weight: Optional[float] = None
    confidence_level: Optional[Union[float, str]] = None


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
