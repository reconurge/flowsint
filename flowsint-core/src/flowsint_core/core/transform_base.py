from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import ValidationError, BaseModel, Field, create_model, TypeAdapter
from pydantic.config import ConfigDict
from .graph_db import Neo4jConnection
from .logger import Logger
from .vault import VaultProtocol
from .graph_service import GraphService, create_graph_service
from ..utils import resolve_type
import warnings


class InvalidTransformParams(Exception):
    pass


def build_params_model(params_schema: list) -> BaseModel:
    """
    Build a strict Pydantic model from a params_schema.
    Unknown fields will raise a validation error.

    Note: Vault secrets are always optional in the Pydantic model to allow
    for deferred configuration. Required validation happens after vault resolution.
    """
    fields: Dict[str, Any] = {}

    for param in params_schema:
        name = param["name"]
        type = str  # You can later enhance this to support int, bool, etc.
        required = param.get("required", False)
        param_type = param.get("type", "string")

        # Vault secrets are always optional in Pydantic validation
        # Required validation happens after vault resolution
        if param_type == "vaultSecret":
            default = param.get("default", None)
        else:
            default = ... if required else param.get("default")

        fields[name] = (
            Optional[type],
            Field(default=default, description=param.get("description", "")),
        )

    model = create_model("ParamsModel", __config__=ConfigDict(extra="forbid"), **fields)

    return model


class Transform(ABC):
    """
    Abstract base class for all transforms.

    ## InputType and OutputType Pattern

    Transforms only need to define InputType and OutputType as class attributes.
    The base class automatically handles schema generation:

    ```python
    from typing import List
    from flowsint_types import Domain
    from flowsint_types import Ip

    class MyTransform(Transform):
        # Define types as class attributes
        InputType = List[Domain]
        OutputType = List[Ip]

        @classmethod
        def name(cls):
            return "my_transform"

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
    InputType = MyTransform.InputType
    OutputType = MyTransform.OutputType
    ```

    The base class automatically provides:
    - input_schema() method using InputType
    - output_schema() method using OutputType
    - Error handling for missing type definitions
    - Consistent schema generation across all transforms

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
        graph_service: Optional[GraphService] = None,
    ):
        self.scan_id = scan_id or "default"
        self.sketch_id = sketch_id or "system"
        self.neo4j_conn = neo4j_conn  # Kept for backward compatibility
        self.vault = vault
        self.params_schema = params_schema or []
        self.ParamsModel = build_params_model(self.params_schema)
        self.params: Dict[str, Any] = params or {}

        # Initialize graph service (new architecture)
        if graph_service:
            self._graph_service = graph_service
        else:
            # Create graph service with the provided or singleton connection
            self._graph_service = create_graph_service(
                sketch_id=self.sketch_id,
                neo4j_connection=neo4j_conn,
                enable_batching=True
            )

        # Params is filled synchronously by the constructor. This params is generally constructed of
        # vaultSecret references, not the key directly. The idea is that the real key values are resolved after calling
        # async_init(), right before the execution.

    async def async_init(self):
        self.ParamsModel = build_params_model(self.params_schema)

        # Always resolve parameters, even if self.params is empty
        # This allows vault secrets to be fetched by name from params_schema
        resolved_params = self.resolve_params()

        # Strict validation after resolution
        try:
            validated = self.ParamsModel(**resolved_params)
            self.params = validated.model_dump()
        except ValidationError as e:
            raise InvalidTransformParams(
                f"Transform '{self.name()}' received invalid parameters: {e}"
            )

    def resolve_params(self) -> Dict[str, Any]:
        resolved = {}

        for param in self.params_schema:
            param_name = param["name"]
            param_type = param.get("type", "string")

            if param_type == "vaultSecret":
                # For vault secrets, try to get from vault by name or ID
                secret = None
                if self.vault is not None:
                    # First, check if user provided a specific vault ID in params
                    if param_name in self.params and self.params[param_name]:
                        secret = self.vault.get_secret(self.params[param_name])
                    # Otherwise, try to get the secret by the param name itself
                    if secret is None:
                        secret = self.vault.get_secret(param_name)

                    if secret is not None:
                        resolved[param_name] = secret
                    elif param.get("required", False):
                        raise Exception(
                            f"Required vault secret '{param_name}' is missing. Please go to the Vault settings and create a '{param_name}' key."
                        )

                # If no vault or no secret found, use default if available
                if param_name not in resolved and param.get("default") is not None:
                    resolved[param_name] = param["default"]
            else:
                # For non-vault params, use the provided value or default
                if param_name in self.params and self.params[param_name]:
                    resolved[param_name] = self.params[param_name]
                elif param.get("default") is not None:
                    resolved[param_name] = param["default"]

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
        """Primary key on which the transform operates (e.g. domain, IP, etc.)"""
        pass

    @classmethod
    def documentation(cls) -> str:
        """
        Return formatted markdown documentation for this transform.
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

    def get_secret(self, key_name: str, default: Any = None) -> Any:
        """
        Get a secret value by key name.
        The secret is automatically resolved from the vault during async_init.

        Args:
            key_name: The name of the secret parameter (e.g., "WHOXY_API_KEY")
            default: Default value if secret is not found

        Returns:
            The secret value from the vault, or default if not found
        """
        return self.params.get(key_name, default)

    def preprocess(self, values: List[str]) -> List[str]:
        return values

    def postprocess(
        self, results: List[Dict[str, Any]], input_data: List[str] = None
    ) -> List[Dict[str, Any]]:
        return results

    async def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        if self.name() != "transform_orchestrator":
            Logger.info(
                self.sketch_id, {"message": f"Transform {self.name()} started."}
            )
        try:
            await self.async_init()
            preprocessed = self.preprocess(values)
            results = await self.scan(preprocessed)
            processed = self.postprocess(results, preprocessed)

            # Flush any pending batch operations
            self._graph_service.flush()

            if self.name() != "transform_orchestrator":
                Logger.completed(
                    self.sketch_id, {"message": f"Transform {self.name()} finished."}
                )

            return processed

        except Exception as e:
            if self.name() != "transform_orchestrator":
                Logger.error(
                    self.sketch_id,
                    {"message": f"Transform {self.name()} errored: '{str(e)}'."},
                )
            return []

    def create_node(
        self, node_type: str, key_prop: str, key_value: str, **properties
    ) -> None:
        """
        Create a single Neo4j node.

        This method now uses the GraphService for improved performance and
        better separation of concerns.

        The following properties are automatically added to every node:
        - type: Lowercase version of node_type
        - sketch_id: Current sketch ID from transform context
        - label: Defaults to key_value if not provided
        - created_at: ISO 8601 UTC timestamp (only on creation, not updates)

        Args:
            node_type: Node label (e.g., "domain", "ip")
            key_prop: Property name used as unique identifier
            key_value: Value of the key property
            **properties: Additional node properties

        Note:
            Uses MERGE semantics - if a node with the same (key_prop, sketch_id)
            exists, it will be updated. The created_at field is only set on creation.
        """
        self._graph_service.create_node(
            node_type=node_type,
            key_prop=key_prop,
            key_value=key_value,
            **properties
        )

    def _serialize_properties(self, properties: dict) -> dict:
        """
        Convert properties to Neo4j-compatible values.

        DEPRECATED: This method is kept for backward compatibility.
        New code should use GraphSerializer directly.

        Args:
            properties: Dictionary of properties to serialize

        Returns:
            Dictionary of serialized properties
        """
        from .graph_serializer import GraphSerializer
        return GraphSerializer.serialize_properties(properties)

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
        """
        Create a relationship between two nodes.

        This method now uses the GraphService for improved performance and
        better separation of concerns.

        Args:
            from_type: Source node label
            from_key: Source node key property
            from_value: Source node key value
            to_type: Target node label
            to_key: Target node key property
            to_value: Target node key value
            rel_type: Relationship type
        """
        self._graph_service.create_relationship(
            from_type=from_type,
            from_key=from_key,
            from_value=from_value,
            to_type=to_type,
            to_key=to_key,
            to_value=to_value,
            rel_type=rel_type
        )

    def log_graph_message(self, message: str) -> None:
        """
        Log a graph operation message.

        Args:
            message: Message to log
        """
        self._graph_service.log_graph_message(message)

    @property
    def graph_service(self) -> GraphService:
        """
        Get the graph service instance.

        Returns:
            GraphService instance for advanced operations
        """
        return self._graph_service
