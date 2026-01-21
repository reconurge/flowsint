"""
Graph module for Neo4j operations.

This module provides all graph-related functionality including:
- Neo4j connection management
- Repository pattern for graph operations
- Serialization utilities
- High-level graph service
"""

from .connection import Neo4jConnection, neo4j_connection
from .repository import Neo4jGraphRepository
from .repository_protocol import GraphRepositoryProtocol
from .serializer import GraphSerializer
from .service import GraphService, create_graph_service, LoggerProtocol
from .types import (
    GraphData,
    GraphEdge,
    GraphNode,
    Neo4jDict,
    NodeMetadata,
)

__all__ = [
    # Connection
    "Neo4jConnection",
    "neo4j_connection",
    # Repository
    "Neo4jGraphRepository",
    "GraphRepositoryProtocol",
    # Serializer
    "GraphSerializer",
    # Service
    "GraphService",
    "create_graph_service",
    "LoggerProtocol",
    # Types
    "GraphData",
    "GraphEdge",
    "GraphNode",
    "Neo4jDict",
    "NodeMetadata",
]
