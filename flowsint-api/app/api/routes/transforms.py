from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import json
from datetime import datetime
from app.utils import extract_input_schema
from app.scanners.registry import ScannerRegistry
from app.core.celery import celery_app 
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
    if category is not None and category != "undefined":
        query = query.filter(Transform.category.any(category))
    return query.all()

# Returns the "raw_material" for the transform editor
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
    
    transform.name = payload.name
    transform.description = payload.description
    transform.category = payload.category
    transform.transform_schema = payload.transform_schema
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
        task = celery_app.send_task("run_transform", args=[serializable_branches, payload.values, payload.sketch_id])
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
    """Calcule les branches de flux en fonction des nœuds et des arêtes"""
    # Trouver les nœuds d'entrée (points de départ)
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
    processed_nodes = set()
    branches = []
    
    def get_outgoing_edges(node_id: str) -> List[Edge]:
        return [edge for edge in edges if edge.source == node_id]

    def traverse_graph(
        node_id: str,
        branch_id: str,
        branch_name: str,
        depth: int,
        input_data: Dict[str, Any],
        visited_in_branch=None
    ):
        branch_counter = 0

        if visited_in_branch is None:
            visited_in_branch = set()
            
        # Ignorer si ce nœud a déjà été visité dans cette branche
        if node_id in visited_in_branch:
            return

        # Marquer comme visité dans cette branche
        visited_in_branch.add(node_id)

        node = node_map.get(node_id)
        if not node:
            return

        # Obtenir ou créer la branche
        branch = next((b for b in branches if b.id == branch_id), None)
        if not branch:
            branch = FlowBranch(id=branch_id, name=branch_name, steps=[])
            branches.append(branch)

        is_input_node = node.data.get("type") == "type"
        
        if is_input_node:
            outputs_array = node.data["outputs"].get("properties", [])
            first_output_name = outputs_array[0].get("name", "output") if outputs_array else "output"
            outputs = {first_output_name: initial_value}
        else:
            outputs = process_node_data(node, input_data)

        # Ajouter l'étape à la branche
        branch.steps.append(
            FlowStep(
                nodeId=node_id,
                inputs={} if is_input_node else input_data,
                outputs=outputs,
                type= "type" if is_input_node else "scanner",
                status="pending",
                branchId=branch_id,
                depth=depth,
            )
        )
        processed_nodes.add(node_id)
        out_edges = get_outgoing_edges(node_id)
        if not out_edges:
            return
        if len(out_edges) == 1:
            edge = out_edges[0]
            target_node = node_map.get(edge.target)
            if target_node:
                # Passer la sortie comme entrée au nœud suivant
                output_key = edge.sourceHandle or list(outputs.keys())[0] if outputs else "output"
                output_value = outputs.get(output_key, None)
                next_input = {edge.targetHandle or "input": output_value}

                traverse_graph(edge.target, branch_id, branch_name, depth + 1, next_input, visited_in_branch)
        # Si plusieurs arêtes sortantes, créer de nouvelles branches
        else:
            for index, edge in enumerate(out_edges):
                target_node = node_map.get(edge.target)
                if target_node:
                    # Créer un nouvel ID de branche pour toutes les arêtes sauf la première
                    new_branch_id = branch_id if index == 0 else f"{branch_id}-{branch_counter}"
                    if index > 0:
                        branch_counter += 1
                    new_branch_name = branch_name if index == 0 else f"{branch_name} (Branch {index + 1})"

                    # Passer la sortie comme entrée au nœud suivant
                    output_key = edge.sourceHandle or list(outputs.keys())[0] if outputs else "output"
                    output_value = outputs.get(output_key, None)
                    next_input = {edge.targetHandle or "input": output_value}

                    # Pour la première arête, continuer dans la même branche
                    # Pour les autres arêtes, créer de nouvelles branches mais ne pas revisiter les nœuds déjà dans ce chemin
                    new_visited = visited_in_branch if index == 0 else visited_in_branch.copy()

                    traverse_graph(edge.target, new_branch_id, new_branch_name, depth + 1, next_input, new_visited)

    # Démarrer DFS à partir de chaque nœud d'entrée
    for index, input_node in enumerate(input_nodes):
        branch_id = f"branch-{index}"
        branch_name = f"Flow {index + 1}" if len(input_nodes) > 1 else "Main Flow"
        traverse_graph(input_node.id, branch_id, branch_name, 0, {})

    # Trier les branches par la profondeur de leur premier nœud
    branches.sort(key=lambda branch: branch.steps[0].depth if branch.steps else 0)

    return branches

def process_node_data(node: Node, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Traite les données de nœud en fonction du type de nœud et des entrées"""
    outputs = {}
    output_types = node.data["outputs"].get("properties", [])
    for output in output_types:
        output_name = output.get("name", "output")
        # Simuler la transformation basée sur la classe/type du nœud
        class_name = node.data.get("class_name", "")
        if class_name == "StringToLower":
            outputs[output_name] = inputs.get("input").lower() if isinstance(inputs.get("input"), str) else inputs.get("input")
        elif class_name == "StringToUpper":
            outputs[output_name] = inputs.get("input").upper() if isinstance(inputs.get("input"), str) else inputs.get("input")
        elif class_name == "Concatenate":
            outputs[output_name] = f"{inputs.get('input1', '')}{inputs.get('input2', '')}"
        elif class_name == "Add":
            outputs[output_name] = (float(inputs.get("input1", 0)) or 0) + (float(inputs.get("input2", 0)) or 0)
        elif class_name == "Multiply":
            outputs[output_name] = (float(inputs.get("input1", 0)) or 0) * (float(inputs.get("input2", 0)) or 0)
        elif class_name == "ParseJSON":
            try:
                outputs[output_name] = json.loads(inputs.get("input")) if isinstance(inputs.get("input"), str) else inputs.get("input")
            except:
                outputs[output_name] = None
        elif class_name == "ExtractDomain":
            if isinstance(inputs.get("input"), str) and "." in inputs.get("input", ""):
                # Simple extraction de domaine avec regex (implémentation simplifiée)
                parts = inputs.get("input").split("/")
                domain_part = next((part for part in parts if "." in part), "")
                outputs[output_name] = domain_part or inputs.get("input")
            else:
                outputs[output_name] = inputs.get("input")
        else:
            # Pour les transformations inconnues, simplement passer l'entrée
            outputs[output_name] = inputs.get("input") or f"transformed_{output_name}"

    return outputs