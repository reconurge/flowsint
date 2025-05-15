from pydantic import BaseModel
from typing import Dict, List, Any, Optional, Literal

class Node(BaseModel):
    id: str
    data: Dict[str, Any]
    position: Optional[Dict[str, float]] = None
    type: Optional[str] = None
    
class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class FlowStep(BaseModel):
    nodeId: str
    type:  Literal["type", "scanner"]
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    status: Literal["pending", "processing", "completed", "error"]
    branchId: str
    depth: int

class FlowBranch(BaseModel):
    id: str
    name: str
    steps: List[FlowStep]