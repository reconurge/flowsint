from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal

class Node(BaseModel):
    id: str = Field(..., description="Unique identifier for the node")
    data: Dict[str, Any] = Field(..., description="Data payload associated with the node")
    position: Optional[Dict[str, float]] = Field(None, description="X and Y coordinates for node positioning")
    type: Optional[str] = Field(None, description="Type of node (e.g., input, output, process)")
    
class Edge(BaseModel):
    id: str = Field(..., description="Unique identifier for the edge")
    data: Optional[Dict[str, Any]] = Field(None, description="Data payload associated with the edge")
    source: str = Field(..., description="ID of the source node")
    target: str = Field(..., description="ID of the target node")
    sourceHandle: Optional[str] = Field(None, description="Handle ID on the source node")
    targetHandle: Optional[str] = Field(None, description="Handle ID on the target node")

class FlowStep(BaseModel):
    nodeId: str = Field(..., description="ID of the associated node")
    type: Literal["type", "scanner"] = Field(..., description="Type of step - either type transformation or scanner")
    inputs: Dict[str, Any] = Field(..., description="Input data for this step")
    outputs: Dict[str, Any] = Field(..., description="Output data from this step")
    status: Literal["pending", "processing", "completed", "error"] = Field(..., description="Current execution status of the step")
    branchId: str = Field(..., description="ID of the branch this step belongs to")
    depth: int = Field(..., description="Depth level of this step in the flow")

class FlowBranch(BaseModel):
    id: str = Field(..., description="Unique identifier for the branch")
    name: str = Field(..., description="Human-readable name of the branch")
    steps: List[FlowStep] = Field(..., description="List of steps in this branch")