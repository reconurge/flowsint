from datetime import datetime

import pytest
from flowsint_types import Domain, Ip

from flowsint_core.core.graph import (
    GraphEdge,
    GraphNode,
    GraphSerializer,
    NodeMetadata,
)


def test_serializer():
    created_at = datetime.now()
    node = GraphNode(
        id="id",
        nodeLabel="nodeLabel",
        nodeFlag="blue",
        nodeType="domain",
        nodeColor="nodeColor",
        nodeSize=4,
        nodeImage="nodeImage",
        nodeIcon="nodeIcon",
        x=100,
        y=100,
        nodeProperties=Domain(domain="domain.com", nodeLabel="domain.com", root=True),
        nodeMetadata=NodeMetadata(created_at=created_at),
    )
    to_neo4j = GraphSerializer.graph_node_to_neo4j_dict(node)

    expected = {
        "id": "id",
        "nodeLabel": "nodeLabel",
        "nodeType": "domain",
        "nodeColor": "nodeColor",
        "nodeFlag": "blue",
        "nodeSize": 4,
        "nodeImage": "nodeImage",
        "nodeIcon": "nodeIcon",
        "x": 100.0,
        "y": 100.0,
        "nodeProperties.domain": "domain.com",
        "nodeProperties.root": True,
        "nodeMetadata.created_at": created_at.isoformat(),
    }

    assert to_neo4j == expected


def test_deserializer():
    created_at = datetime.now()

    node = {
        "id": "id",
        "data": {
            "nodeLabel": "nodeLabel",
            "nodeType": "domain",
            "nodeColor": "nodeColor",
            "nodeSize": 4,
            "nodeImage": "nodeImage",
            "nodeIcon": "nodeIcon",
            "x": 100.0,
            "y": 100.0,
            "nodeProperties.domain": "domain.com",
            "nodeProperties.root": True,
            "nodeMetadata.created_at": created_at.isoformat(),
        },
    }

    graph_node = GraphNode(
        id="id",
        nodeLabel="nodeLabel",
        nodeType="domain",
        nodeColor="nodeColor",
        nodeSize=4,
        nodeImage="nodeImage",
        nodeIcon="nodeIcon",
        x=100,
        y=100,
        nodeProperties=Domain(domain="domain.com", nodeLabel="domain.com", root=True),
        nodeMetadata=NodeMetadata(created_at=created_at),
    )
    output = GraphSerializer.neo4j_dict_to_graph_node(node)

    assert output == graph_node


def test_serialize_from_flowsint_type():
    domain = Domain(domain="domain.com", nodeLabel="domain.com", root=True)

    neo4j_dict = GraphSerializer.flowsint_type_to_neo4j_dict(domain)

    # Check static fields
    assert neo4j_dict["id"] == ""
    assert neo4j_dict["nodeLabel"] == "domain.com"
    assert neo4j_dict["nodeType"] == "domain"
    assert neo4j_dict["nodeColor"] is None
    assert neo4j_dict["nodeSize"] is None
    assert neo4j_dict["nodeImage"] is None
    assert neo4j_dict["nodeIcon"] is None
    assert neo4j_dict["nodeFlag"] is None
    assert neo4j_dict["x"] == 100.0
    assert neo4j_dict["y"] == 100.0
    assert neo4j_dict["nodeProperties.domain"] == "domain.com"
    assert neo4j_dict["nodeProperties.root"] is True

    # Timestamp is generated internally, just verify it exists and is ISO format
    assert "nodeMetadata.created_at" in neo4j_dict
    assert "T" in neo4j_dict["nodeMetadata.created_at"]


class TestCleanEmptyValues:
    def test_removes_empty_strings(self):
        data = {"key1": "value", "key2": "", "key3": "another"}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {"key1": "value", "key3": "another"}

    def test_removes_none_values(self):
        data = {"key1": "value", "key2": None, "key3": "another"}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {"key1": "value", "key3": "another"}

    def test_cleans_nested_dicts(self):
        data = {"outer": {"inner1": "value", "inner2": "", "inner3": None}}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {"outer": {"inner1": "value"}}

    def test_cleans_lists(self):
        data = {"items": ["a", "", "b", None, "c"]}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {"items": ["a", "b", "c"]}

    def test_cleans_list_of_dicts(self):
        data = {"items": [{"a": "1", "b": ""}, {"c": None, "d": "2"}]}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {"items": [{"a": "1"}, {"d": "2"}]}

    def test_removes_empty_nested_dict(self):
        data = {"outer": {"inner": ""}}
        result = GraphSerializer._clean_empty_values(data)
        assert result == {}


class TestParseFlowsintType:
    def test_parses_domain(self):
        entity = {"domain": "example.com", "root": True}
        result = GraphSerializer.parse_flowsint_type(entity, "domain")
        assert isinstance(result, Domain)
        assert result.domain == "example.com"
        assert result.root is True

    def test_parses_ip(self):
        entity = {"address": "192.168.1.1"}
        result = GraphSerializer.parse_flowsint_type(entity, "ip")
        assert isinstance(result, Ip)
        assert result.address == "192.168.1.1"

    def test_cleans_empty_values_before_parsing(self):
        entity = {"domain": "example.com", "extra": "", "other": None}
        result = GraphSerializer.parse_flowsint_type(entity, "domain")
        assert isinstance(result, Domain)
        assert result.domain == "example.com"

    def test_raises_on_unknown_type(self):
        entity = {"key": "value"}
        with pytest.raises(ValueError, match="Unknown type: unknowntype"):
            GraphSerializer.parse_flowsint_type(entity, "unknowntype")


class TestGraphNodeToFlowsintType:
    def test_extracts_node_properties(self):
        domain = Domain(domain="example.com")
        node = GraphNode(
            id="123",
            nodeLabel="example.com",
            nodeType="domain",
            nodeProperties=domain,
            nodeMetadata=NodeMetadata(),
        )
        result = GraphSerializer.graph_node_to_flowsint_type(node)
        assert result is domain
        assert isinstance(result, Domain)
        assert result.domain == "example.com"


class TestGraphDictToGraphEdge:
    def test_converts_edge_dict(self):
        edge_dict = {
            "id": "edge-123",
            "source": "node-1",
            "target": "node-2",
            "type": "CONNECTED_TO",
        }
        result = GraphSerializer.neo4j_dict_to_graph_edge(edge_dict)
        assert isinstance(result, GraphEdge)
        assert result.id == "edge-123"
        assert result.source == "node-1"
        assert result.target == "node-2"
        assert result.label == "CONNECTED_TO"

    def test_converts_values_to_string(self):
        edge_dict = {"id": 123, "source": 1, "target": 2, "type": "REL"}
        result = GraphSerializer.neo4j_dict_to_graph_edge(edge_dict)
        assert result.id == "123"
        assert result.source == "1"
        assert result.target == "2"


class TestGraphEdgeToGraphDict:
    def test_with_flowsint_types(self):
        from_obj = Domain(domain="source.com")
        to_obj = Domain(domain="target.com")
        result = GraphSerializer.graph_edge_to_neo4j_dict(from_obj, to_obj, "LINKS_TO")
        assert result == {
            "from_type": "domain",
            "from_label": "source.com",
            "to_type": "domain",
            "to_label": "target.com",
            "rel_label": "LINKS_TO",
        }

    def test_with_graph_nodes(self):
        from_obj = GraphNode(
            id="1",
            nodeLabel="source",
            nodeType="ip",
            nodeProperties=Ip(address="1.1.1.1"),
            nodeMetadata=NodeMetadata(),
        )
        to_obj = GraphNode(
            id="2",
            nodeLabel="target",
            nodeType="domain",
            nodeProperties=Domain(domain="example.com"),
            nodeMetadata=NodeMetadata(),
        )
        result = GraphSerializer.graph_edge_to_neo4j_dict(from_obj, to_obj, "RESOLVES")
        assert result == {
            "from_type": "ip",
            "from_label": "source",
            "to_type": "domain",
            "to_label": "target",
            "rel_label": "RESOLVES",
        }

    def test_with_mixed_types(self):
        from_obj = Domain(domain="source.com")
        to_obj = GraphNode(
            id="2",
            nodeLabel="target",
            nodeType="ip",
            nodeProperties=Ip(address="1.1.1.1"),
            nodeMetadata=NodeMetadata(),
        )
        result = GraphSerializer.graph_edge_to_neo4j_dict(from_obj, to_obj, "HOSTS")
        assert result == {
            "from_type": "domain",
            "from_label": "source.com",
            "to_type": "ip",
            "to_label": "target",
            "rel_label": "HOSTS",
        }


class TestDeserializeNodes:
    def test_deserializes_multiple_nodes(self):
        node_dicts = [
            {
                "id": "1",
                "data": {
                    "nodeLabel": "example.com",
                    "nodeType": "domain",
                    "nodeProperties.domain": "example.com",
                    "nodeMetadata.created_at": "2026-01-01T00:00:00",
                },
            },
            {
                "id": "2",
                "data": {
                    "nodeLabel": "1.1.1.1",
                    "nodeType": "ip",
                    "nodeProperties.address": "1.1.1.1",
                    "nodeMetadata.created_at": "2026-01-01T00:00:00",
                },
            },
        ]
        result = GraphSerializer.deserialize_nodes(node_dicts)
        assert len(result) == 2
        assert all(isinstance(node, GraphNode) for node in result)
        assert result[0].nodeLabel == "example.com"
        assert result[1].nodeLabel == "1.1.1.1"

    def test_empty_list(self):
        result = GraphSerializer.deserialize_nodes([])
        assert result == []


class TestDeserializeEdges:
    def test_deserializes_multiple_edges(self):
        edge_dicts = [
            {"id": "e1", "source": "n1", "target": "n2", "type": "CONNECTS"},
            {"id": "e2", "source": "n2", "target": "n3", "type": "LINKS"},
        ]
        result = GraphSerializer.deserialize_edges(edge_dicts)
        assert len(result) == 2
        assert all(isinstance(edge, GraphEdge) for edge in result)
        assert result[0].label == "CONNECTS"
        assert result[1].label == "LINKS"

    def test_empty_list(self):
        result = GraphSerializer.deserialize_edges([])
        assert result == []


class TestGraphDictToGraphNodeErrors:
    def test_raises_on_missing_data(self):
        node_dict = {"id": "123"}
        with pytest.raises(Exception, match="Could not find node data"):
            GraphSerializer.neo4j_dict_to_graph_node(node_dict)
