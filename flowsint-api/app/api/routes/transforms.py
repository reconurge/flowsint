from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import json
from datetime import datetime
from app.utils import extract_input_schema
from app.scanners.registry import ScannerRegistry
from app.core.celery import celery
from app.types.domain import MinimalDomain
from app.types.ip import MinimalIp
from app.types.social import MinimalSocial
from app.types.organization import MinimalOrganization
from app.types.email import Email
from app.types.transform import Node, Edge, FlowStep, FlowBranch
from sqlalchemy.orm import Session
from app.core.postgre_db import get_db
from app.models.models import Transform, Profile
from app.api.deps import get_current_user
from app.api.schemas.transform import TransformRead, TransformCreate, TransformUpdate

class FlowComputationRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputType: Optional[str] = None

class FlowComputationResponse(BaseModel):
    transformBranches: List[FlowBranch]
    initialData: Any
    
class StepSimulationRequest(BaseModel):
    transformBranches: List[FlowBranch]
    currentStepIndex: int

class LaunchTransformPayload(BaseModel):
    values: List[str]
    sketch_id: str

router = APIRouter()

# Get the list of all transforms
@router.get("", response_model=List[TransformRead])
def get_transforms(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    query = db.query(Transform)
    # if category is not None and category != "undefined":
    #     query = query.filter(Transform.category.any(category))
    return query.all()

# Returns the "raw_materials" for the transform editor
@router.get("/raw_materials")
async def get_scans_list(current_user: Profile = Depends(get_current_user)):
    scanners = ScannerRegistry.list_by_category()
    flattened_scanners = {
        category: [
            {
                "class_name": scanner["class_name"],
                "name": scanner["name"],
                "module": scanner["module"],
                "doc": scanner["doc"],
                "inputs": scanner["inputs"],
                "outputs": scanner["outputs"],
                "type": "scanner"
            }
            for scanner in scanner_list
        ]
        for category, scanner_list in scanners.items()
    }

    # Ajoute les types comme des "scanners" spéciaux de type 'type'
    object_inputs = [
        extract_input_schema("MinimalDomain", MinimalDomain),
        extract_input_schema("MinimalIp", MinimalIp),
        extract_input_schema("MinimalSocial", MinimalSocial),
        extract_input_schema("Email", Email),
        extract_input_schema("MinimalOrganization", MinimalOrganization)
    ]

    flattened_scanners["types"] = object_inputs

    return {"items": flattened_scanners}


# Create a new transform
@router.post("/create", response_model=TransformRead, status_code=status.HTTP_201_CREATED)
def create_transform(payload: TransformCreate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    new_transform = Transform(
        id=uuid4(),
        name=payload.name,
        description=payload.description,
        category=payload.category,
        transform_schema=payload.transform_schema,
        created_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow(),
    )
    db.add(new_transform)
    db.commit()
    db.refresh(new_transform)
    return new_transform

# Get a transform by ID
@router.get("/{transform_id}", response_model=TransformRead)
def get_transform_by_id(transform_id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    transform = db.query(Transform).filter(Transform.id == transform_id).first()
    if not transform:
        raise HTTPException(status_code=404, detail="Transform not found")
    return transform

# Update a transform by ID
@router.put("/{transform_id}", response_model=TransformRead)
def update_transform(transform_id: UUID, payload: TransformUpdate, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    transform = db.query(Transform).filter(Transform.id == transform_id).first()
    if not transform:
        raise HTTPException(status_code=404, detail="Transform not found")
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        print(f'only update {key}')
        setattr(transform, key, value)
    
    transform.last_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(transform)
    return transform


# Delete a transform by ID
@router.delete("/{transform_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transform(transform_id: UUID, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    transform = db.query(Transform).filter(Transform.id == transform_id).first()
    if not transform:
        raise HTTPException(status_code=404, detail="Transform not found")
    db.delete(transform)
    db.commit()
    return None


@router.post("/{transform_id}/launch")
async def launch_transform(
    transform_id: str,
    payload: LaunchTransformPayload,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    try:
        transform = db.query(Transform).filter(Transform.id == transform_id).first()
        print(transform)
        if transform is None:
            raise HTTPException(status_code=404, detail="Transform not found")
        nodes = [Node(**node) for node in transform.transform_schema["nodes"]]
        edges = [Edge(**edge) for edge in transform.transform_schema["edges"]]
        transform_branches = compute_transform_branches(
            payload.values, 
            nodes, 
            edges
        )
        serializable_branches = [branch.dict() for branch in transform_branches]
        task = celery.send_task("run_transform", args=[serializable_branches, payload.values, payload.sketch_id])
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Transform not found")

@router.post("/{transform_id}/compute", response_model=FlowComputationResponse)
def compute_transforms(request: FlowComputationRequest, current_user: Profile = Depends(get_current_user)):
    initial_data = generate_sample_data(request.inputType or "string")
    transform_branches = compute_transform_branches(
        initial_data, 
        request.nodes, 
        request.edges
    )   
    return FlowComputationResponse(
        transformBranches=transform_branches,
        initialData=initial_data
    )
    
def generate_sample_data(type_str: str) -> Any:
    type_str = type_str.lower() if type_str else "string"
    if type_str == "string":
        return "sample_text"
    elif type_str == "number":
        return 42
    elif type_str == "boolean":
        return True
    elif type_str == "array":
        return [1, 2, 3]
    elif type_str == "object":
        return {"key": "value"}
    elif type_str == "url":
        return "https://example.com"
    elif type_str == "email":
        return "user@example.com"
    elif type_str == "domain":
        return "example.com"
    elif type_str == "ip":
        return "192.168.1.1"
    else:
        return f"sample_{type_str}"

def compute_transform_branches(initial_value: Any, nodes: List[Node], edges: List[Edge]) -> List[FlowBranch]:
    """Computes flow branches based on nodes and edges with proper DFS traversal"""
    # Find input nodes (starting points)
    input_nodes = [node for node in nodes if node.data.get("type") == "type"]

    if not input_nodes:
        return [
            FlowBranch(
                id="error",
                name="Error",
                steps=[
                    FlowStep(
                        nodeId="error",
                        inputs={},
                        type="error",
                        outputs={},
                        status="error",
                        branchId="error",
                        depth=0,
                    )
                ],
            )
        ]

    node_map = {node.id: node for node in nodes}
    branches = []
    branch_counter = 0
    # Track scanner outputs across all branches
    scanner_outputs = {}

    def calculate_path_length(start_node: str, visited: set = None) -> int:
        """Calculate the shortest possible path length from a node to any leaf"""
        if visited is None:
            visited = set()
        
        if start_node in visited:
            return float('inf')
            
        visited.add(start_node)
        out_edges = [edge for edge in edges if edge.source == start_node]
        
        if not out_edges:
            return 1
            
        min_length = float('inf')
        for edge in out_edges:
            length = calculate_path_length(edge.target, visited.copy())
            min_length = min(min_length, length)
            
        return 1 + min_length

    def get_outgoing_edges(node_id: str) -> List[Edge]:
        """Get outgoing edges sorted by the shortest possible path length"""
        out_edges = [edge for edge in edges if edge.source == node_id]
        # Sort edges by the length of the shortest possible path from their target
        return sorted(
            out_edges,
            key=lambda e: calculate_path_length(e.target)
        )

    def create_step(node_id: str, branch_id: str, depth: int, input_data: Dict[str, Any], is_input_node: bool, outputs: Dict[str, Any]) -> FlowStep:
        return FlowStep(
            nodeId=node_id,
            inputs={} if is_input_node else input_data,
            outputs=outputs,
            type="type" if is_input_node else "scanner",
            status="pending",
            branchId=branch_id,
            depth=depth,
        )

    def explore_branch(current_node_id: str, branch_id: str, branch_name: str, depth: int, input_data: Dict[str, Any], path: List[str], branch_visited: set, steps: List[FlowStep], parent_outputs: Dict[str, Any] = None) -> None:
        nonlocal branch_counter

        # Skip if node is already in current path (cycle detection)
        if current_node_id in path:
            return

        current_node = node_map.get(current_node_id)
        if not current_node:
            return

        # Process node outputs
        is_input_node = current_node.data.get("type") == "type"
        if is_input_node:
            outputs_array = current_node.data["outputs"].get("properties", [])
            first_output_name = outputs_array[0].get("name", "output") if outputs_array else "output"
            current_outputs = {first_output_name: initial_value}
        else:
            # Check if we already have outputs for this scanner
            if current_node_id in scanner_outputs:
                current_outputs = scanner_outputs[current_node_id]
            else:
                current_outputs = process_node_data(current_node, input_data)
                # Store the outputs for future use
                scanner_outputs[current_node_id] = current_outputs

        # Create and add current step
        current_step = create_step(current_node_id, branch_id, depth, input_data, is_input_node, current_outputs)
        steps.append(current_step)
        path.append(current_node_id)
        branch_visited.add(current_node_id)

        # Get all outgoing edges sorted by path length
        out_edges = get_outgoing_edges(current_node_id)
        
        if not out_edges:
            # Leaf node reached, save the branch
            branches.append(FlowBranch(id=branch_id, name=branch_name, steps=steps[:]))
        else:
            # Process each outgoing edge in order of shortest path
            for i, edge in enumerate(out_edges):
                if edge.target in path:  # Skip if would create cycle
                    continue
                    
                # Prepare next node's input
                output_key = edge.sourceHandle
                if not output_key and current_outputs:
                    output_key = list(current_outputs.keys())[0]
                
                output_value = current_outputs.get(output_key) if output_key else None
                if output_value is None and parent_outputs:
                    output_value = parent_outputs.get(output_key) if output_key else None

                next_input = {edge.targetHandle or "input": output_value}

                if i == 0:
                    # Continue in same branch (will be shortest path)
                    explore_branch(
                        edge.target,
                        branch_id,
                        branch_name,
                        depth + 1,
                        next_input,
                        path,
                        branch_visited,
                        steps,
                        current_outputs
                    )
                else:
                    # Create new branch starting from current node
                    branch_counter += 1
                    new_branch_id = f"{branch_id}-{branch_counter}"
                    new_branch_name = f"{branch_name} (Branch {branch_counter})"
                    new_steps = steps[:len(steps)]  # Copy steps up to current node
                    new_branch_visited = branch_visited.copy()  # Create new visited set for the branch
                    explore_branch(
                        edge.target,
                        new_branch_id,
                        new_branch_name,
                        depth + 1,
                        next_input,
                        path[:],  # Create new path copy for branch
                        new_branch_visited,
                        new_steps,
                        current_outputs
                    )

        # Backtrack: remove current node from path and remove its step
        path.pop()
        steps.pop()

    # Start exploration from each input node
    for index, input_node in enumerate(input_nodes):
        branch_id = f"branch-{index}"
        branch_name = f"Flow {index + 1}" if len(input_nodes) > 1 else "Main Flow"
        explore_branch(
            input_node.id,
            branch_id,
            branch_name,
            0,
            {},
            [],  # Use list for path to maintain order
            set(),  # Use set for visited to check membership
            [],
            None
        )

    # Sort branches by length (number of steps)
    branches.sort(key=lambda branch: len(branch.steps))
    return branches

def process_node_data(node: Node, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Traite les données de nœud en fonction du type de nœud et des entrées"""
    outputs = {}
    output_types = node.data["outputs"].get("properties", [])
    
    for output in output_types:
        output_name = output.get("name", "output")
        class_name = node.data.get("class_name", "")
        # For simulation purposes, we'll return a placeholder value based on the scanner type
        if class_name in ["ReverseResolveScanner", "ResolveScanner"]:
            # IP/Domain resolution scanners
            outputs[output_name] = "192.168.1.1" if "ip" in output_name.lower() else "example.com"
        elif class_name == "SubdomainScanner":
            # Subdomain scanner
            outputs[output_name] = f"sub.{inputs.get('input', 'example.com')}"
        
        elif class_name == "WhoisScanner":
            # WHOIS scanner
            outputs[output_name] = {
                "domain": inputs.get("input", "example.com"),
                "registrar": "Example Registrar",
                "creation_date": "2020-01-01"
            }
        
        elif class_name == "GeolocationScanner":
            # Geolocation scanner
            outputs[output_name] = {
                "country": "France",
                "city": "Paris",
                "coordinates": {"lat": 48.8566, "lon": 2.3522}
            }
        
        elif class_name == "MaigretScanner":
            # Social media scanner
            outputs[output_name] = {
                "username": inputs.get("input", "user123"),
                "platforms": ["twitter", "github", "linkedin"]
            }
        
        elif class_name == "HoleheScanner":
            # Email verification scanner
            outputs[output_name] = {
                "email": inputs.get("input", "user@example.com"),
                "exists": True,
                "platforms": ["gmail", "github"]
            }
        
        elif class_name == "SireneScanner":
            # Organization scanner
            outputs[output_name] = {
                "name": inputs.get("input", "Example Corp"),
                "siret": "12345678901234",
                "address": "1 Example Street"
            }
        
        else:
            # For unknown scanners, pass through the input
            outputs[output_name] = inputs.get("input") or f"transformed_{output_name}"

    return outputs