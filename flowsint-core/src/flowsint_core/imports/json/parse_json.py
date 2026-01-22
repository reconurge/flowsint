import json
from typing import Dict, List

from flowsint_types import TYPE_REGISTRY, Individual

from ..types import Edge, Entity, EntityPreview, FileParseResult
from ..utils import create_entity_preview

VALID_NODES_KEYS = ["nodes", "entities"]
VALID_EDGES_KEYS = ["edges", "links", "relations", "rels"]
VALID_EDGE_FROM_KEYS = ["from", "source"]
VALID_EDGE_TO_KEYS = ["to", "target"]


def parse_json(
    file_bytes: bytes,
    max_preview_rows: int,
) -> FileParseResult:
    """Parse JSON files."""
    try:
        file_bytes = file_bytes.lstrip()
        entities: Dict[str, Entity] = {}
        my_bytes_value = file_bytes.decode().replace("'", '"')
        graph = json.loads(my_bytes_value)
        node_key = next((k for k in VALID_NODES_KEYS if k in graph), None)
        edge_key = next((k for k in VALID_EDGES_KEYS if k in graph), None)
        if node_key is None:
            raise Exception(
                f"No valid nodes keys found in JSON. Please provide one of : {', '.join(VALID_NODES_KEYS)}"
            )

        if edge_key is None:
            raise Exception(
                f"No valid edges keys found in JSON. Please provide one of : {', '.join(VALID_EDGES_KEYS)}"
            )
        nodes = _get_nodes(graph.get(node_key))
        edges = _get_edges(graph.get(edge_key))
        for node in nodes:
            if node:
                if node.detected_type in entities:
                    entities[node.detected_type].results.append(node)
                else:
                    entities[node.detected_type] = Entity(
                        type=node.detected_type, results=[node]
                    )
        edges_to_insert = []
        for edge in edges:
            label = edge.get("label", "IS_RELATED_TO")
            from_id = edge.get("source")
            to_id = edge.get("target")
            from_obj = next((node for node in nodes if node.node_id == from_id), None)
            to_obj = next((node for node in nodes if node.node_id == to_id), None)
            if from_obj and to_obj:
                edges_to_insert.append(
                    Edge(
                        from_obj=from_obj.obj,
                        from_id=from_obj.node_id,
                        to_obj=to_obj.obj,
                        to_id=to_obj.node_id,
                        label=label,
                    )
                )
        return FileParseResult(
            entities=entities, edges=edges_to_insert, total_entities=0
        )
    except Exception as e:
        raise Exception(f"Invalid JSON: {str(e)}")


def _get_nodes(nodes: List[Dict]) -> List[EntityPreview]:
    results = []
    for node in nodes:
        node_id = node.get("id")
        node_type = node.get("nodeType", node.get("type"))
        label = node.get("nodeLabel", node.get("label"))
        node_obj = {"nodeType": node_type, "nodeLabel": label, **node}
        preview = _parse_node(node_obj)
        if preview:
            results.append(
                EntityPreview(
                    node_id=node_id,
                    obj=preview.obj,
                    detected_type=preview.detected_type,
                )
            )

    return results


def _parse_node(nodeDict: dict) -> EntityPreview | None:
    type = nodeDict.get("nodeType")
    first_key = next(iter(nodeDict), None)
    label = (
        nodeDict.get("nodeLabel")
        or (nodeDict.get(first_key) if first_key else None)
        or nodeDict.get("id")
    )
    if label is None:
        return None
    if not type:
        return create_entity_preview(label)
    # Try to find a matching type in TYPE_REGISTRY
    DetectedType = TYPE_REGISTRY.get_lowercase(type.lower())
    if not DetectedType:
        # Type not recognized, fall back to generic
        return create_entity_preview(label)

    if hasattr(DetectedType, "from_string"):
        node = DetectedType.from_string(label)
    else:
        # Default to Individual node type
        node = Individual.from_string(label)

    detected_type = DetectedType.__name__
    return EntityPreview(obj=node, detected_type=detected_type)


def _get_edges(edges: List[Dict]) -> List[Dict]:
    results = []
    for edge in edges:
        source_key = next((k for k in VALID_EDGE_FROM_KEYS if k in edge), None)
        target_key = next((k for k in VALID_EDGE_TO_KEYS if k in edge), None)
        if source_key is None:
            print(
                f"No valid source key found in edge object. Please provide one of : {', '.join(VALID_EDGE_FROM_KEYS)}"
            )
        if target_key is None:
            print(
                f"No valid target key found in edge object. Please provide one of : {', '.join(VALID_EDGE_TO_KEYS)}"
            )
        source = edge.get(source_key, None)
        target = edge.get(target_key, None)
        label = edge.get("label", None)
        edge_obj = {
            "source": source,
            "target": target,
            "label": label if label else "IS_RELATED_TO",
        }
        results.append(edge_obj)

    return results
