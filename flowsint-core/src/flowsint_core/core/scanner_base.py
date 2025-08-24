from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import ValidationError, BaseModel, Field, create_model, TypeAdapter
from pydantic.config import ConfigDict
from .graph_db import Neo4jConnection
from .logger import Logger
from .vault import VaultProtocol
from ..utils import resolve_type


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
        fields[name] = (
            Optional[type],
            Field(default=default, description=param.get("description", "")),
        )

    model = create_model("ParamsModel", __config__=ConfigDict(extra="forbid"), **fields)

    return model


class Scanner(ABC):
    """
    Abstract base class for all scanners.

    ## InputType and OutputType Pattern

    Scanners only need to define InputType and OutputType as class attributes.
    The base class automatically handles schema generation:

    ```python
    from typing import List
    from flowsint_types import Domain
    from flowsint_types import Ip

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
        params: Optional[Dict[str, Any]] = None,
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
            Logger.debug(
                self.sketch_id, {"message": f"Resolved params: {str(resolved_params)}"}
            )
        else:
            resolved_params = {}
        # Strict validation after resolution
        try:
            validated = self.ParamsModel(**resolved_params)
            self.params = validated.model_dump()
        except ValidationError as e:
            raise InvalidScannerParams(
                f"Scanner '{self.name()}' received invalid parameters: {e}"
            )

    def resolve_params(self) -> Dict[str, Any]:
        resolved = {}
        Logger.debug(
            self.sketch_id, {"message": f"Params schema: {str(self.params_schema)}"}
        )
        Logger.debug(self.sketch_id, {"message": f"Params: {str(self.params)}"})
        Logger.debug(
            self.sketch_id,
            {"message": f"Params schema length: {len(self.params_schema)}"},
        )
        i = 1
        for param in self.params_schema:
            Logger.debug(self.sketch_id, {"message": f"Param {i}: {str(param)}"})
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
    def documentation(cls) -> str:
        """
        Return formatted markdown documentation for this scanner.
        Override this method to provide custom documentation.
        Falls back to cleaned docstring if not overridden.
        """
        import inspect

        return inspect.cleandoc(cls.__doc__ or "No documentation available.")

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
                ],
            }
        else:
            # Handle simpler schemas
            return {
                "type": schema.get("title", "Any"),
                "properties": [{"name": "value", "type": "object"}],
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
                ],
            }
        else:
            # Handle simpler schemas
            return {
                "type": schema.get("title", "Any"),
                "properties": [{"name": "value", "type": "object"}],
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

    def postprocess(
        self, results: List[Dict[str, Any]], input_data: List[str] = None
    ) -> List[Dict[str, Any]]:
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
                Logger.completed(
                    self.sketch_id, {"message": f"Scanner {self.name()} finished."}
                )

            return processed

        except Exception as e:
            if self.name() != "transform_orchestrator":
                Logger.error(
                    self.sketch_id,
                    {"message": f"Scanner {self.name()} errored: '{str(e)}'."},
                )
            return []

    def create_node(
        self, node_type: str, key_prop: str, key_value: str, **properties
    ) -> None:
        """Simple helper to create a single Neo4j node."""
        if not self.neo4j_conn:
            return

        # Serialize properties to handle nested Pydantic objects
        serialized_properties = self._serialize_properties(properties)

        # Ensure all values are Neo4j-compatible primitive types
        final_properties = {}
        for key, value in serialized_properties.items():
            if value is None:
                final_properties[key] = ""
            elif isinstance(value, (str, int, float, bool)):
                final_properties[key] = "" if value == "None" else value
            else:
                # Convert any remaining complex types to strings
                final_properties[key] = str(value)

        final_properties["type"] = node_type.lower()
        final_properties["sketch_id"] = self.sketch_id
        final_properties["label"] = final_properties.get("label", key_value)

        set_clauses = [f"n.{prop} = ${prop}" for prop in final_properties.keys()]
        params = {key_prop: key_value, **final_properties}

        query = f"""
        MERGE (n:{node_type} {{{key_prop}: ${key_prop}}})
        SET {', '.join(set_clauses)}
        """
        self.neo4j_conn.query(query, params)

    def _serialize_properties(self, properties: dict) -> dict:
        """Convert properties to Neo4j-compatible values, handling nested Pydantic objects."""
        serialized = {}

        for key, value in properties.items():

            if hasattr(value, "__dict__") and not isinstance(
                value, (str, int, float, bool)
            ):
                # Handle Pydantic objects and other complex objects
                if hasattr(value, "model_dump"):  # Pydantic v2
                    # Flatten the Pydantic object into individual properties
                    flattened = value.model_dump()
                    for nested_key, nested_value in flattened.items():
                        if nested_value is not None:
                            serialized[f"{key}_{nested_key}"] = nested_value
                elif hasattr(value, "dict"):  # Pydantic v1
                    # Flatten the Pydantic object into individual properties
                    flattened = value.dict()
                    for nested_key, nested_value in flattened.items():
                        if nested_value is not None:
                            serialized[f"{key}_{nested_key}"] = nested_value
                else:
                    # For other objects, try to convert to dict or string
                    try:
                        flattened = value.__dict__
                        for nested_key, nested_value in flattened.items():
                            if nested_value is not None:
                                serialized[f"{key}_{nested_key}"] = nested_value
                    except:
                        serialized[key] = str(value)
            elif isinstance(value, list):
                # Handle lists - convert all items to primitive types
                serialized_list = []
                for item in value:
                    if hasattr(item, "__dict__") and not isinstance(
                        item, (str, int, float, bool)
                    ):
                        # Convert complex objects to strings
                        serialized_list.append(str(item))
                    else:
                        serialized_list.append(item)
                serialized[key] = serialized_list
            elif isinstance(value, dict):
                # Handle dictionaries - flatten them
                for dict_key, dict_value in value.items():
                    if dict_value is not None:
                        serialized[f"{key}_{dict_key}"] = dict_value
            else:
                # Keep primitive types as-is
                serialized[key] = value

        return serialized

    def create_relationship(
        self,
        from_type: str,
        from_key: str,
        from_value: str,
        to_type: str,
        to_key: str,
        to_value: str,
        rel_type: str,
    ) -> None:
        """Simple helper to create a relationship between two nodes."""
        if not self.neo4j_conn:
            return

        query = f"""
        MATCH (from:{from_type} {{{from_key}: $from_value}})
        MATCH (to:{to_type} {{{to_key}: $to_value}})
        MERGE (from)-[:{rel_type} {{sketch_id: $sketch_id}}]->(to)
        """

        self.neo4j_conn.query(
            query,
            {
                "from_value": from_value,
                "to_value": to_value,
                "sketch_id": self.sketch_id,
            },
        )

    def log_graph_message(self, message: str) -> None:
        """Simple helper to log a graph message."""
        Logger.graph_append(self.sketch_id, {"message": message})
