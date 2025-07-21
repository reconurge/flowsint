from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import ValidationError, BaseModel, Field, create_model
from pydantic.config import ConfigDict

from app.core.graph_db import Neo4jConnection
from app.core.logger import Logger
from app.core.vault import VaultProtocol


class InvalidScannerParams(Exception):
    pass


def build_params_model(params_schema: list) -> BaseModel:
    """
    Build a strict Pydantic model from a params_schema.
    Unknown fields will raise a validation error.
    """
    fields: Dict[str, Any] = {}

    for param in params_schema:
        name = param["name"]
        typ = str  # You can later enhance this to support int, bool, etc.
        required = param.get("required", False)
        default = ... if required else param.get("default")
        fields[name] = (Optional[typ], Field(default=default, description=param.get("description", "")))

    model = create_model(
        "ParamsModel",
        __config__=ConfigDict(extra="forbid"),
        **fields
    )

    return model

class Scanner(ABC):
    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        params_schema: Optional[List[Dict[str, Any]]] = None,
        vault: Optional[VaultProtocol] = None,
        params: Optional[Dict[str, Any]] = None
    ):
        self.scan_id = scan_id or "default"
        self.sketch_id = sketch_id or "system"
        self.neo4j_conn = neo4j_conn
        self.vault = vault
        self.params_schema = params_schema or []
        self.ParamsModel = build_params_model(self.params_schema)
        self.params: Dict[str, Any] = params or {}
        # Params is filled synchronously by the constructor. This params is generally constructed of 
        # vaultSecret references, not the key directly. The idea is that the real key values are resolved after calling
        # async_init(), right before the execution.

    async def async_init(self):
        self.ParamsModel = build_params_model(self.params_schema)
        # Resolve parameters (e.g. replace vaultSecret by real secrets)
        if self.params:
            resolved_params = self.resolve_params()
            Logger.debug(self.sketch_id, {"message": f"Resolved params: {str(resolved_params)}"})
        else:
            resolved_params = {}
        # Strict validation after resolution
        try:
            validated = self.ParamsModel(**resolved_params)
            self.params = validated.model_dump()
        except ValidationError as e:
            raise InvalidScannerParams(f"Scanner '{self.name()}' received invalid parameters: {e}")

    def resolve_params(self) -> Dict[str, Any]:
        resolved = {}
        Logger.warn(self.sketch_id, {"message": f"Params schema: {str(self.params_schema)}"})
        Logger.warn(self.sketch_id, {"message": f"Params: {str(self.params)}"})
        Logger.warn(self.sketch_id, {"message": f"Params schema length: {len(self.params_schema)}"})
        i = 1
        for param in self.params_schema:
            Logger.warn(self.sketch_id, {"message": f"Param {i}: {str(param)}"})
            i += 1
            if param["type"] == "vaultSecret":
                # Check if the vault secret parameter is provided
                if param["name"] in self.params and self.params[param["name"]]:
                    if self.vault is not None:
                        secret = self.vault.get_secret(self.params[param["name"]])
                        if secret is not None:
                            resolved[param["name"]] = secret
                        else:
                            # If secret not found in vault, keep the original parameter value
                            resolved[param["name"]] = self.params[param["name"]]
                    else:
                        # If vault is not available, use the parameter value as-is
                        resolved[param["name"]] = self.params[param["name"]]
                elif param.get("default") is not None:
                    resolved[param["name"]] = param["default"]
                # If not provided and no default, skip (optional parameter)
            else:
                if param["name"] in self.params and self.params[param["name"]]:
                    resolved[param["name"]] = self.params[param["name"]]
                elif param.get("default") is not None:
                    resolved[param["name"]] = param["default"]
                else:
                    continue
        return resolved


    @classmethod
    def requires_key(self) -> bool:
       return False

    @classmethod
    @abstractmethod
    def name(cls) -> str:
        pass

    @classmethod
    @abstractmethod
    def category(cls) -> str:
        pass

    @classmethod
    @abstractmethod
    def key(cls) -> str:
        """Primary key on which the scanner operates (e.g. domain, IP, etc.)"""
        pass

    @classmethod
    @abstractmethod
    def input_schema(cls) -> Dict[str, Any]:
        pass

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Can be overridden in subclasses to declare required parameters"""
        return []

    @classmethod
    @abstractmethod
    def output_schema(cls) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        pass

    def set_params(self, params: Dict[str, Any]) -> None:
        self.params = params

    def get_params(self) -> Dict[str, Any]:
        return self.params

    def preprocess(self, values: List[str]) -> List[str]:
        return values

    def postprocess(self, results: List[Dict[str, Any]], input_data: List[str] = None) -> List[Dict[str, Any]]:
        return results

    async def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        if self.name() != "transform_orchestrator":
            Logger.info(self.sketch_id, {"message": f"Scanner {self.name()} started."})

        try:
            await self.async_init()
            preprocessed = self.preprocess(values)
            results = await self.scan(preprocessed)
            processed = self.postprocess(results, preprocessed)

            if self.name() != "transform_orchestrator":
                Logger.completed(self.sketch_id, {"message": f"Scanner {self.name()} finished."})

            return processed

        except Exception as e:
            if self.name() != "transform_orchestrator":
                Logger.error(self.sketch_id, {"message": f"Scanner {self.name()} errored: '{str(e)}'."})
            return []

