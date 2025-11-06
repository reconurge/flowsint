from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from flowsint_core.utils import extract_input_schema_flow
from flowsint_core.core.registry import TransformRegistry
from flowsint_core.core.celery import celery
from flowsint_types import Domain, Phrase, Ip, SocialProfile, Organization, Email, Phone
from flowsint_core.core.types import Node, Edge, FlowStep, FlowBranch
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Flow, Profile, CustomType
from app.api.deps import get_current_user
from sqlalchemy import func
from app.api.schemas.flow import FlowRead, FlowCreate, FlowUpdate
from flowsint_types import (
    ASN,
    CIDR,
    CryptoWallet,
    CryptoWalletTransaction,
    CryptoNFT,
    Website,
    Individual,
)


class FlowComputationRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputType: Optional[str] = None


class FlowComputationResponse(BaseModel):
    flowBranches: List[FlowBranch]
    initialData: Any


class StepSimulationRequest(BaseModel):
    flowBranches: List[FlowBranch]
    currentStepIndex: int


class launchFlowPayload(BaseModel):
    values: List[str]
    sketch_id: str


router = APIRouter()


@router.get("/", response_model=List[FlowRead])
def get_flows(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    if not category or category.lower() == "undefined":
        return db.query(Flow).order_by(Flow.last_updated_at.desc()).all()

    custom_type = (
        db.query(CustomType)
        .filter(
            CustomType.owner_id == current_user.id,
            CustomType.status == "published",
            func.lower(CustomType.name) == category.lower(),
        )
        .first()
    )
    if custom_type:
        flows = db.query(Flow).order_by(Flow.last_updated_at.desc()).all()
        return [
            {
                **(flow.to_dict() if hasattr(flow, "to_dict") else flow.__dict__),
                "wobblyType": True,
            }
            for flow in flows
        ]
        
    flows = db.query(Flow).order_by(Flow.last_updated_at.desc()).all()
    return [
        flow
        for flow in flows
        if any(cat.lower() == category.lower() for cat in flow.category)
    ]


# Returns the "raw_materials" for the flow editor
@router.get("/raw_materials")
async def get_material_list():
    transforms = TransformRegistry.list_by_categories()
    transform_categories = {
        category: [
            {
                "class_name": transform.get("class_name"),
                "category": transform.get("category"),
                "name": transform.get("name"),
                "module": transform.get("module"),
                "documentation": transform.get("documentation"),
                "description": transform.get("description"),
                "inputs": transform.get("inputs"),
                "outputs": transform.get("outputs"),
                "type": "transform",
                "params": transform.get("params"),
                "params_schema": transform.get("params_schema"),
                "required_params": transform.get("required_params"),
                "icon": transform.get("icon"),
            }
            for transform in transform_list
        ]
        for category, transform_list in transforms.items()
    }

    object_inputs = [
        extract_input_schema_flow(Phrase),
        extract_input_schema_flow(Organization),
        extract_input_schema_flow(Individual),
        extract_input_schema_flow(Domain),
        extract_input_schema_flow(Website),
        extract_input_schema_flow(Ip),
        extract_input_schema_flow(Phone),
        extract_input_schema_flow(ASN),
        extract_input_schema_flow(CIDR),
        extract_input_schema_flow(SocialProfile),
        extract_input_schema_flow(Email),
        extract_input_schema_flow(CryptoWallet),
        extract_input_schema_flow(CryptoWalletTransaction),
        extract_input_schema_flow(CryptoNFT),
    ]

    # Put types first, then add all transform categories
    flattened_transforms = {"types": object_inputs}
    flattened_transforms.update(transform_categories)

    return {"items": flattened_transforms}


# Returns the "raw_materials" for the flow editor
@router.get("/input_type/{input_type}")
async def get_material_list(input_type: str):
    transforms = TransformRegistry.list_by_input_type(input_type)
    return {"items": transforms}


# Create a new flow
@router.post("/create", response_model=FlowRead, status_code=status.HTTP_201_CREATED)
def create_flow(
    payload: FlowCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):

    new_flow = Flow(
        id=uuid4(),
        name=payload.name,
        description=payload.description,
        category=payload.category,
        flow_schema=payload.flow_schema,
        created_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow(),
    )
    db.add(new_flow)
    db.commit()
    db.refresh(new_flow)
    return new_flow


# Get a flow by ID
@router.get("/{flow_id}", response_model=FlowRead)
def get_flow_by_id(
    flow_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="flow not found")
    return flow


# Update a flow by ID
@router.put("/{flow_id}", response_model=FlowRead)
def update_flow(
    flow_id: UUID,
    payload: FlowUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="flow not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        print(f"only update {key}")
        if key == "category":
            if "SocialProfile" in value:
                value.append("Username")
        setattr(flow, key, value)

    flow.last_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(flow)
    return flow


# Delete a flow by ID
@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flow(
    flow_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="flow not found")
    db.delete(flow)
    db.commit()
    return None


@router.post("/{flow_id}/launch")
async def launch_flow(
    flow_id: str,
    payload: launchFlowPayload,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    try:
        flow = db.query(Flow).filter(Flow.id == flow_id).first()
        if flow is None:
            raise HTTPException(status_code=404, detail="flow not found")
        nodes = [Node(**node) for node in flow.flow_schema["nodes"]]
        edges = [Edge(**edge) for edge in flow.flow_schema["edges"]]
        flow_branches = compute_flow_branches(payload.values, nodes, edges)
        serializable_branches = [branch.model_dump() for branch in flow_branches]
        task = celery.send_task(
            "run_flow",
            args=[
                serializable_branches,
                payload.values,
                payload.sketch_id,
                str(current_user.id),
            ],
        )
        return {"id": task.id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="flow not found")


@router.post("/{flow_id}/compute", response_model=FlowComputationResponse)
def compute_flows(
    request: FlowComputationRequest, current_user: Profile = Depends(get_current_user)
):
    initial_data = generate_sample_data(request.inputType or "string")
    flow_branches = compute_flow_branches(initial_data, request.nodes, request.edges)
    return FlowComputationResponse(flowBranches=flow_branches, initialData=initial_data)


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


def compute_flow_branches(
    initial_value: Any, nodes: List[Node], edges: List[Edge]
) -> List[FlowBranch]:
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
    # Track transform outputs across all branches
    transform_outputs = {}

    def calculate_path_length(start_node: str, visited: set = None) -> int:
        """Calculate the shortest possible path length from a node to any leaf"""
        if visited is None:
            visited = set()

        if start_node in visited:
            return float("inf")

        visited.add(start_node)
        out_edges = [edge for edge in edges if edge.source == start_node]

        if not out_edges:
            return 1

        min_length = float("inf")
        for edge in out_edges:
            length = calculate_path_length(edge.target, visited.copy())
            min_length = min(min_length, length)

        return 1 + min_length

    def get_outgoing_edges(node_id: str) -> List[Edge]:
        """Get outgoing edges sorted by the shortest possible path length"""
        out_edges = [edge for edge in edges if edge.source == node_id]
        # Sort edges by the length of the shortest possible path from their target
        return sorted(out_edges, key=lambda e: calculate_path_length(e.target))

    def create_step(
        node_id: str,
        branch_id: str,
        depth: int,
        input_data: Dict[str, Any],
        is_input_node: bool,
        outputs: Dict[str, Any],
        node_params: Optional[Dict[str, Any]] = None,
    ) -> FlowStep:
        return FlowStep(
            nodeId=node_id,
            params=node_params,
            inputs={} if is_input_node else input_data,
            outputs=outputs,
            type="type" if is_input_node else "transform",
            status="pending",
            branchId=branch_id,
            depth=depth,
        )

    def explore_branch(
        current_node_id: str,
        branch_id: str,
        branch_name: str,
        depth: int,
        input_data: Dict[str, Any],
        path: List[str],
        branch_visited: set,
        steps: List[FlowStep],
        parent_outputs: Dict[str, Any] = None,
    ) -> None:
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
            first_output_name = (
                outputs_array[0].get("name", "output") if outputs_array else "output"
            )
            current_outputs = {first_output_name: initial_value}
        else:
            # Check if we already have outputs for this transform
            if current_node_id in transform_outputs:
                current_outputs = transform_outputs[current_node_id]
            else:
                current_outputs = process_node_data(current_node, input_data)
                # Store the outputs for future use
                transform_outputs[current_node_id] = current_outputs

        # Extract node parameters
        node_params = current_node.data.get("params", {})

        # Create and add current step
        current_step = create_step(
            current_node_id,
            branch_id,
            depth,
            input_data,
            is_input_node,
            current_outputs,
            node_params,
        )
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
                    output_value = (
                        parent_outputs.get(output_key) if output_key else None
                    )

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
                        current_outputs,
                    )
                else:
                    # Create new branch starting from current node
                    branch_counter += 1
                    new_branch_id = f"{branch_id}-{branch_counter}"
                    new_branch_name = f"{branch_name} (Branch {branch_counter})"
                    new_steps = steps[: len(steps)]  # Copy steps up to current node
                    new_branch_visited = (
                        branch_visited.copy()
                    )  # Create new visited set for the branch
                    explore_branch(
                        edge.target,
                        new_branch_id,
                        new_branch_name,
                        depth + 1,
                        next_input,
                        path[:],  # Create new path copy for branch
                        new_branch_visited,
                        new_steps,
                        current_outputs,
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
            None,
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
        # For simulation purposes, we'll return a placeholder value based on the transform type
        if class_name in ["ReverseResolveTransform", "ResolveTransform"]:
            # IP/Domain resolution transforms
            outputs[output_name] = (
                "192.168.1.1" if "ip" in output_name.lower() else "example.com"
            )
        elif class_name == "SubdomainTransform":
            # Subdomain transform
            outputs[output_name] = f"sub.{inputs.get('input', 'example.com')}"

        elif class_name == "WhoisTransform":
            # WHOIS transform
            outputs[output_name] = {
                "domain": inputs.get("input", "example.com"),
                "registrar": "Example Registrar",
                "creation_date": "2020-01-01",
            }

        elif class_name == "IpToInfosTransform":
            # Geolocation transform
            outputs[output_name] = {
                "country": "France",
                "city": "Paris",
                "coordinates": {"lat": 48.8566, "lon": 2.3522},
            }

        elif class_name == "MaigretTransform":
            # Social media transform
            outputs[output_name] = {
                "username": inputs.get("input", "user123"),
                "platforms": ["twitter", "github", "linkedin"],
            }

        elif class_name == "HoleheTransform":
            # Email verification transform
            outputs[output_name] = {
                "email": inputs.get("input", "user@example.com"),
                "exists": True,
                "platforms": ["gmail", "github"],
            }

        elif class_name == "SireneTransform":
            # Organization transform
            outputs[output_name] = {
                "name": inputs.get("input", "Example Corp"),
                "siret": "12345678901234",
                "address": "1 Example Street",
            }

        else:
            # For unknown transforms, pass through the input
            outputs[output_name] = inputs.get("input") or f"flowed_{output_name}"

    return outputs
