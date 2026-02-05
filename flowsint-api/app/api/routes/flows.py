from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from flowsint_core.core.celery import celery
from flowsint_core.core.graph import create_graph_service
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    NotFoundError,
    PermissionDeniedError,
    create_flow_service,
)
from flowsint_core.core.types import FlowBranch, FlowEdge, FlowNode, FlowStep
from flowsint_core.utils import extract_input_schema_flow
from flowsint_enrichers import ENRICHER_REGISTRY, load_all_enrichers
from flowsint_types import (
    ASN,
    CIDR,
    CryptoNFT,
    CryptoWallet,
    CryptoWalletTransaction,
    DNSRecord,
    Domain,
    Email,
    Individual,
    Ip,
    Organization,
    Phone,
    Phrase,
    Port,
    SocialAccount,
    Username,
    Website,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.flow import FlowCreate, FlowRead, FlowUpdate

load_all_enrichers()


class FlowComputationRequest(BaseModel):
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    inputType: Optional[str] = None


class FlowComputationResponse(BaseModel):
    flowBranches: List[FlowBranch]
    initialData: Any


class StepSimulationRequest(BaseModel):
    flowBranches: List[FlowBranch]
    currentStepIndex: int


class launchFlowPayload(BaseModel):
    node_ids: List[str]
    sketch_id: str


router = APIRouter()


@router.get("/", response_model=List[FlowRead])
def get_flows(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    return service.get_all_flows(category, current_user.id)


@router.get("/raw_materials")
async def get_material_list():
    enrichers = ENRICHER_REGISTRY.list_by_categories()
    enricher_categories = {
        category: [
            {
                "class_name": enricher.get("class_name"),
                "category": enricher.get("category"),
                "name": enricher.get("name"),
                "module": enricher.get("module"),
                "documentation": enricher.get("documentation"),
                "description": enricher.get("description"),
                "inputs": enricher.get("inputs"),
                "outputs": enricher.get("outputs"),
                "type": "enricher",
                "params": enricher.get("params"),
                "params_schema": enricher.get("params_schema"),
                "required_params": enricher.get("required_params"),
                "icon": enricher.get("icon"),
            }
            for enricher in enricher_list
        ]
        for category, enricher_list in enrichers.items()
    }

    object_inputs = [
        extract_input_schema_flow(Phrase),
        extract_input_schema_flow(Organization),
        extract_input_schema_flow(Individual),
        extract_input_schema_flow(Domain),
        extract_input_schema_flow(Website),
        extract_input_schema_flow(Ip),
        extract_input_schema_flow(DNSRecord),
        extract_input_schema_flow(Port),
        extract_input_schema_flow(Phone),
        extract_input_schema_flow(ASN),
        extract_input_schema_flow(CIDR),
        extract_input_schema_flow(Username),
        extract_input_schema_flow(SocialAccount),
        extract_input_schema_flow(Email),
        extract_input_schema_flow(CryptoWallet),
        extract_input_schema_flow(CryptoWalletTransaction),
        extract_input_schema_flow(CryptoNFT),
    ]

    flattened_enrichers = {"types": object_inputs}
    flattened_enrichers.update(enricher_categories)

    return {"items": flattened_enrichers}


@router.get("/input_type/{input_type}")
async def get_material_by_input_type(input_type: str):
    enrichers = ENRICHER_REGISTRY.list_by_input_type(input_type)
    return {"items": enrichers}


@router.post("/create", response_model=FlowRead, status_code=status.HTTP_201_CREATED)
def create_flow(
    payload: FlowCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    return service.create(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        flow_schema=payload.flow_schema,
    )


@router.get("/{flow_id}", response_model=FlowRead)
def get_flow_by_id(
    flow_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    try:
        return service.get_by_id(flow_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Flow not found")


@router.put("/{flow_id}", response_model=FlowRead)
def update_flow(
    flow_id: UUID,
    payload: FlowUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    try:
        return service.update(flow_id, payload.model_dump(exclude_unset=True))
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Flow not found")


@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flow(
    flow_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    try:
        service.delete(flow_id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Flow not found")


@router.post("/{flow_id}/launch")
async def launch_flow(
    flow_id: str,
    payload: launchFlowPayload,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_flow_service(db)
    try:
        flow = service.get_by_id(UUID(flow_id))
        service.get_sketch_for_launch(payload.sketch_id, current_user.id)

        # Retrieve entities from Neo4J by their element IDs
        graph_service = create_graph_service(sketch_id=payload.sketch_id)
        entities = graph_service.get_nodes_by_ids_for_task(payload.node_ids)

        # Compute flow branches
        nodes = [FlowNode(**node) for node in flow.flow_schema["nodes"]]
        edges = [FlowEdge(**edge) for edge in flow.flow_schema["edges"]]

        entities = [
            entity.model_dump(mode="json", serialize_as_any=True) for entity in entities
        ]

        sample_value = (
            entities[0].get("nodeLabel", "sample_value")
            if len(entities)
            else "sample_value"
        )
        flow_branches = compute_flow_branches(sample_value, nodes, edges)
        serializable_branches = [branch.model_dump() for branch in flow_branches]

        task = celery.send_task(
            "run_flow",
            args=[
                serializable_branches,
                entities,
                payload.sketch_id,
                str(current_user.id),
            ],
        )
        return {"id": task.id}

    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error launching flow: {str(e)}")


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
    initial_value: Any, nodes: List[FlowNode], edges: List[FlowEdge]
) -> List[FlowBranch]:
    """Computes flow branches based on nodes and edges with proper DFS traversal"""
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
    enricher_outputs = {}

    def calculate_path_length(start_node: str, visited: set = None) -> int:
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

    def get_outgoing_edges(node_id: str) -> List[FlowEdge]:
        out_edges = [edge for edge in edges if edge.source == node_id]
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
            type="type" if is_input_node else "enricher",
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

        if current_node_id in path:
            return

        current_node = node_map.get(current_node_id)
        if not current_node:
            return

        is_input_node = current_node.data.get("type") == "type"
        if is_input_node:
            outputs_array = current_node.data["outputs"].get("properties", [])
            first_output_name = (
                outputs_array[0].get("name", "output") if outputs_array else "output"
            )
            current_outputs = {first_output_name: initial_value}
        else:
            if current_node_id in enricher_outputs:
                current_outputs = enricher_outputs[current_node_id]
            else:
                current_outputs = process_node_data(current_node, input_data)
                enricher_outputs[current_node_id] = current_outputs

        node_params = current_node.data.get("params", {})

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

        out_edges = get_outgoing_edges(current_node_id)

        if not out_edges:
            branches.append(FlowBranch(id=branch_id, name=branch_name, steps=steps[:]))
        else:
            for i, edge in enumerate(out_edges):
                if edge.target in path:
                    continue

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
                    branch_counter += 1
                    new_branch_id = f"{branch_id}-{branch_counter}"
                    new_branch_name = f"{branch_name} (Branch {branch_counter})"
                    new_steps = steps[: len(steps)]
                    new_branch_visited = branch_visited.copy()
                    explore_branch(
                        edge.target,
                        new_branch_id,
                        new_branch_name,
                        depth + 1,
                        next_input,
                        path[:],
                        new_branch_visited,
                        new_steps,
                        current_outputs,
                    )

        path.pop()
        steps.pop()

    for index, input_node in enumerate(input_nodes):
        branch_id = f"branch-{index}"
        branch_name = f"Flow {index + 1}" if len(input_nodes) > 1 else "Main Flow"
        explore_branch(
            input_node.id,
            branch_id,
            branch_name,
            0,
            {},
            [],
            set(),
            [],
            None,
        )

    branches.sort(key=lambda branch: len(branch.steps))
    return branches


def process_node_data(node: FlowNode, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Process node data based on node type and inputs"""
    outputs = {}
    output_types = node.data["outputs"].get("properties", [])

    for output in output_types:
        output_name = output.get("name", "output")
        class_name = node.data.get("class_name", "")

        if class_name in ["ReverseResolveEnricher", "ResolveEnricher"]:
            outputs[output_name] = (
                "192.168.1.1" if "ip" in output_name.lower() else "example.com"
            )
        elif class_name == "SubdomainEnricher":
            outputs[output_name] = f"sub.{inputs.get('input', 'example.com')}"
        elif class_name == "WhoisEnricher":
            outputs[output_name] = {
                "domain": inputs.get("input", "example.com"),
                "registrar": "Example Registrar",
                "creation_date": "2020-01-01",
            }
        elif class_name == "IpToInfosEnricher":
            outputs[output_name] = {
                "country": "France",
                "city": "Paris",
                "coordinates": {"lat": 48.8566, "lon": 2.3522},
            }
        elif class_name == "MaigretEnricher":
            outputs[output_name] = {
                "username": inputs.get("input", "user123"),
                "platforms": ["twitter", "github", "linkedin"],
            }
        elif class_name == "HoleheEnricher":
            outputs[output_name] = {
                "email": inputs.get("input", "user@example.com"),
                "exists": True,
                "platforms": ["gmail", "github"],
            }
        elif class_name == "SireneEnricher":
            outputs[output_name] = {
                "name": inputs.get("input", "Example Corp"),
                "siret": "12345678901234",
                "address": "1 Example Street",
            }
        else:
            outputs[output_name] = inputs.get("input") or f"flowed_{output_name}"

    return outputs
