from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, get_origin, get_args
from pydantic import ValidationError, BaseModel, Field, create_model, TypeAdapter
from pydantic.config import ConfigDict
from app.core.graph_db import Neo4jConnection
from app.core.logger import Logger
from app.core.vault import VaultProtocol
from app.utils import resolve_type

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
        type = str  # You can later enhance this to support int, bool, etc.
        required = param.get("required", False)
        default = ... if required else param.get("default")
        fields[name] = (Optional[type], Field(default=default, description=param.get("description", "")))

    model = create_model(
        "ParamsModel",
        __config__=ConfigDict(extra="forbid"),
        **fields
    )

    return model

class Scanner(ABC):
    """
    Abstract base class for all scanners.
    
    ## InputType and OutputType Pattern
    
    Scanners only need to define InputType and OutputType as class attributes.
    The base class automatically handles schema generation:
    
    ```python
    from typing import List
    from app.types.domain import Domain
    from app.types.ip import Ip
    
    class MyScanner(Scanner):
        # Define types as class attributes
        InputType = List[Domain]
        OutputType = List[Ip]
        
        @classmethod
        def name(cls):
            return "my_scanner"
            
        @classmethod
        def category(cls):
            return "Domain"
            
        @classmethod
        def key(cls):
            return "domain"
        
        def preprocess(self, data: InputType) -> InputType:
            cleaned: InputType = []
            # ... implementation
            return cleaned
            
        async def scan(self, data: InputType) -> OutputType:
            results: OutputType = []
            # ... implementation
            return results
    
    # Make types available at module level for easy access
    InputType = MyScanner.InputType
    OutputType = MyScanner.OutputType
    ```
    
    The base class automatically provides:
    - input_schema() method using InputType
    - output_schema() method using OutputType
    - Error handling for missing type definitions
    - Consistent schema generation across all scanners
    
    Subclasses can override input_schema() or output_schema() if needed for special cases.
    """
    
    # Abstract type aliases that must be defined in subclasses for runtime use
    InputType = NotImplemented
    OutputType = NotImplemented
    
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
    def required_params(self) -> bool:
       return False

    @classmethod
    @abstractmethod
    def name(cls) -> str:
        pass
    
    @classmethod
    def icon(cls) -> str | None:
        return None

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
    def input_schema(cls) -> Dict[str, Any]:
        """
        Generate input schema from InputType class attribute.
        Subclasses don't need to override this unless they have special requirements.
        """
        return cls.generate_input_schema()

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Can be overridden in subclasses to declare required parameters"""
        return []

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        """
        Generate output schema from OutputType class attribute.
        Subclasses don't need to override this unless they have special requirements.
        """
        return cls.generate_output_schema()
    
    @classmethod
    def generate_input_schema(cls) -> Dict[str, Any]:
        """
        Helper method to generate input schema from InputType class attribute.
        
        Raises:
            NotImplementedError: If InputType is not defined in the subclass
        """
        if cls.InputType is NotImplemented:
            raise NotImplementedError(f"InputType must be defined in {cls.__name__}")
            
        adapter = TypeAdapter(cls.InputType)
        schema = adapter.json_schema()
        
        # Handle different schema structures
        if "$defs" in schema and schema["$defs"]:
            # Follow the $ref in items to get the correct type (not just the first one)
            items_ref = schema.get("items", {}).get("$ref")
            if items_ref:
                # Extract type name from $ref like "#/$defs/Website" -> "Website"
                type_name = items_ref.split("/")[-1]
                details = schema["$defs"][type_name]
            else:
                # Fallback: get the first type definition (for backward compatibility)
                type_name, details = list(schema["$defs"].items())[0]
            
            return {
                "type": type_name,
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in details["properties"].items()
                ]
            }
        else:
            # Handle simpler schemas
            return {
                "type": schema.get("title", "Any"),
                "properties": [{"name": "value", "type": "object"}]
            }
    
    @classmethod 
    def generate_output_schema(cls) -> Dict[str, Any]:
        """
        Helper method to generate output schema from OutputType class attribute.
        
        Raises:
            NotImplementedError: If OutputType is not defined in the subclass
        """
        if cls.OutputType is NotImplemented:
            raise NotImplementedError(f"OutputType must be defined in {cls.__name__}")
            
        adapter = TypeAdapter(cls.OutputType)
        schema = adapter.json_schema()
        
        # Handle different schema structures
        if "$defs" in schema and schema["$defs"]:
            # Follow the $ref in items to get the correct type (not just the first one)
            items_ref = schema.get("items", {}).get("$ref")
            if items_ref:
                # Extract type name from $ref like "#/$defs/Website" -> "Website"
                type_name = items_ref.split("/")[-1]
                details = schema["$defs"][type_name]
            else:
                # Fallback: get the first type definition (for backward compatibility)
                type_name, details = list(schema["$defs"].items())[0]
            
            return {
                "type": type_name,
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in details["properties"].items()
                ]
            }
        else:
            # Handle simpler schemas
            return {
                "type": schema.get("title", "Any"),
                "properties": [{"name": "value", "type": "object"}]
            }

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

