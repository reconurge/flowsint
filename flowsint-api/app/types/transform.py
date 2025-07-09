from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal

class Node(BaseModel):
    id: str = Field(..., description="Unique identifier for the node", title="Node ID")
    data: Dict[str, Any] = Field(..., description="Data payload associated with the node", title="Node Data")
    position: Optional[Dict[str, float]] = Field(None, description="X and Y coordinates for node positioning", title="Position")
    type: Optional[str] = Field(None, description="Type of node (e.g., input, output, process)", title="Node Type")
    
class Edge(BaseModel):
    id: str = Field(..., description="Unique identifier for the edge", title="Edge ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Data payload associated with the edge", title="Edge Data")
    source: str = Field(..., description="ID of the source node", title="Source Node")
    target: str = Field(..., description="ID of the target node", title="Target Node")
    sourceHandle: Optional[str] = Field(None, description="Handle ID on the source node", title="Source Handle")
    targetHandle: Optional[str] = Field(None, description="Handle ID on the target node", title="Target Handle")

class FlowStep(BaseModel):
    nodeId: str = Field(..., description="ID of the associated node", title="Node ID")
    type: Literal["type", "scanner"] = Field(..., description="Type of step - either type transformation or scanner", title="Step Type")
    inputs: Dict[str, Any] = Field(..., description="Input data for this step", title="Inputs")
    outputs: Dict[str, Any] = Field(..., description="Output data from this step", title="Outputs")
    status: Literal["pending", "processing", "completed", "error"] = Field(..., description="Current execution status of the step", title="Status")
    branchId: str = Field(..., description="ID of the branch this step belongs to", title="Branch ID")
    depth: int = Field(..., description="Depth level of this step in the flow", title="Depth")

class FlowBranch(BaseModel):
    id: str = Field(..., description="Unique identifier for the branch", title="Branch ID")
    name: str = Field(..., description="Human-readable name of the branch", title="Branch Name")
    steps: List[FlowStep] = Field(..., description="List of steps in this branch", title="Steps")