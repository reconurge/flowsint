"""
Service layer for flowsint-core.

This module provides business logic services that encapsulate database operations
and domain logic, enabling cleaner route handlers and better testability.
"""

from .exceptions import (
    ServiceError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
    DatabaseError,
    AuthenticationError,
    ConflictError,
)
from .base import BaseService
from .auth_service import AuthService, create_auth_service
from .key_service import KeyService, create_key_service
from .investigation_service import InvestigationService, create_investigation_service
from .sketch_service import SketchService, create_sketch_service
from .analysis_service import AnalysisService, create_analysis_service
from .chat_service import ChatService, create_chat_service
from .scan_service import ScanService, create_scan_service
from .log_service import LogService, create_log_service
from .flow_service import FlowService, create_flow_service
from .custom_type_service import CustomTypeService, create_custom_type_service
from .type_registry_service import TypeRegistryService, create_type_registry_service
from .enricher_service import EnricherService, create_enricher_service
from .vault_service import VaultService, create_vault_service

__all__ = [
    # Exceptions
    "ServiceError",
    "NotFoundError",
    "PermissionDeniedError",
    "ValidationError",
    "DatabaseError",
    "AuthenticationError",
    "ConflictError",
    # Base
    "BaseService",
    # Services - Phase 1
    "AuthService",
    "create_auth_service",
    "KeyService",
    "create_key_service",
    # Services - Phase 2
    "InvestigationService",
    "create_investigation_service",
    "SketchService",
    "create_sketch_service",
    # Services - Phase 3
    "AnalysisService",
    "create_analysis_service",
    "ChatService",
    "create_chat_service",
    "ScanService",
    "create_scan_service",
    "LogService",
    "create_log_service",
    # Services - Phase 4
    "FlowService",
    "create_flow_service",
    "CustomTypeService",
    "create_custom_type_service",
    "TypeRegistryService",
    "create_type_registry_service",
    "EnricherService",
    "create_enricher_service",
    # Vault
    "VaultService",
    "create_vault_service",
]
