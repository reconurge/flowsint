from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import ValidationError, BaseModel, Field, create_model, TypeAdapter
from pydantic.config import ConfigDict
from .graph_db import Neo4jConnection
from .logger import Logger
from .vault import VaultProtocol
from .graph_service import GraphService, create_graph_service
from ..utils import resolve_type

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
        # Define types as class attributes (base types, not lists)
        InputType = Domain
        OutputType = Ip

        @classmethod
        def name(cls):
            return "my_transform"

        @classmethod
        def category(cls):
            return "Domain"

        @classmethod
        def key(cls):
            return "domain"

        # preprocess receives a list and returns a list of validated InputType instances
        def preprocess(self, data: List) -> List[InputType]:
            # Generic implementation handles validation automatically
            return super().preprocess(data)

        # scan receives a list of InputType and returns a list of OutputType
        async def scan(self, data: List[InputType]) -> List[OutputType]:
            results: List[OutputType] = []
            # ... implementation
            return results

    # Make types available at module level for easy access
    InputType = MyTransform.InputType
    OutputType = MyTransform.OutputType
    ```

    The base class automatically provides:
    - Generic preprocess() that validates inputs using InputType
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
                enable_batching=True,
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
        # Check for direct properties first (even if $defs exists for nested types)
        if "properties" in schema and "title" in schema:
            # Direct type definition (e.g., Domain, Ip, Website)
            return {
                "type": schema.get("title", "Any"),
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in schema["properties"].items()
                ],
            }
        elif "$defs" in schema and schema["$defs"] and "$ref" in schema:
            # Reference to a type in $defs
            type_name = schema["$ref"].split("/")[-1]
            details = schema["$defs"][type_name]
            return {
                "type": type_name,
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in details["properties"].items()
                ],
            }
        else:
            # Fallback for unknown schema structures
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
        # Check for direct properties first (even if $defs exists for nested types)
        if "properties" in schema and "title" in schema:
            # Direct type definition (e.g., Domain, Ip, Website)
            return {
                "type": schema.get("title", "Any"),
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in schema["properties"].items()
                ],
            }
        elif "$defs" in schema and schema["$defs"] and "$ref" in schema:
            # Reference to a type in $defs
            type_name = schema["$ref"].split("/")[-1]
            details = schema["$defs"][type_name]
            return {
                "type": type_name,
                "properties": [
                    {"name": prop, "type": resolve_type(info, schema)}
                    for prop, info in details["properties"].items()
                ],
            }
        else:
            # Fallback for unknown schema structures
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
        value = self.params.get(key_name, default)
        # If the value is None, return the default instead (allows fallback to env vars)
        return value if value is not None else default

    def preprocess(self, values: List) -> List:
        """
        Generic preprocess that validates and converts input using InputType.
        Automatically handles dicts, objects, and strings (using the model's primary field).
        Invalid items are skipped silently.

        Note: InputType should be defined as the base type (e.g., Ip, Domain),
        not as a List (e.g., List[Ip]). The preprocess method expects a list of values
        and returns a list of validated InputType instances.
        """
        if self.InputType is NotImplemented:
            return values

        base_type = self.InputType
        adapter = TypeAdapter(base_type)

        # Trouver le champ primaire marqué par Field(..., primary=True)
        primary_field = None
        if issubclass(base_type, BaseModel):
            for name, field in base_type.model_fields.items():
                if field.json_schema_extra and field.json_schema_extra.get("primary"):
                    primary_field = name
                    break
            if primary_field is None:
                # fallback : premier champ requis ou premier champ disponible
                for name, field in base_type.model_fields.items():
                    if field.is_required():
                        primary_field = name
                        break
                if primary_field is None:
                    primary_field = next(iter(base_type.model_fields.keys()))

        cleaned = []

        for item in values:
            try:
                # Si item est une string, transformer en dict {primary_field: string}
                if isinstance(item, str) and primary_field:
                    item = {primary_field: item}

                validated = adapter.validate_python(item)
                cleaned.append(validated)
            except Exception:
                # Ignore les items invalides
                continue

        return cleaned

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
                    {"message": f"Transform {self.name()} errored: {str(e)}"},
                )
            return []

    def create_node(
        self, node_type_or_obj, key_prop=None, key_value=None, **properties
    ) -> None:
        """
        Create a single Neo4j node.

        This method now uses the GraphService for improved performance and
        better separation of concerns.

        The following properties are automatically added to every node:
        - type: Lowercase version of node_type
        - sketch_id: Current sketch ID from transform context
        - label: Automatically computed by FlowsintType, or defaults to key_value if not provided
        - created_at: ISO 8601 UTC timestamp (only on creation, not updates)

        Best Practice - Use Pydantic object directly:
            The simplest way is to pass a Pydantic object directly. The node type,
            key property, and key value are automatically inferred:

            ```python
            # Best: pass the Pydantic object directly
            self.create_node(ip)

            # Also good if you need to override properties
            self.create_node(domain, type="subdomain")
            ```

        Args:
            node_type_or_obj: Either a Pydantic object (FlowsintType), or node label string (e.g., "domain", "ip")
            key_prop: Property name used as unique identifier (optional if passing Pydantic object)
            key_value: Value of the key property (optional if passing Pydantic object)
            **properties: Additional node properties or property overrides

        Note:
            Uses MERGE semantics - if a node with the same (key_prop, sketch_id)
            exists, it will be updated. The created_at field is only set on creation.
        """
        # Check if first argument is a Pydantic object
        if isinstance(node_type_or_obj, BaseModel):
            obj = node_type_or_obj

            # Infer node_type from class name (e.g., Ip -> "ip", Domain -> "domain")
            node_type = obj.__class__.__name__.lower()

            # Get the primary field and its value
            primary_field = self._get_primary_field(obj)
            key_prop = primary_field
            key_value = getattr(obj, primary_field)

            # If key_value is itself a Pydantic model, extract its primary value
            if isinstance(key_value, BaseModel):
                key_value = self._extract_primary_value(key_value)

            # Merge object properties with any overrides, but skip nested Pydantic objects
            # Use model_dump(mode="json") to properly serialize Pydantic types (e.g., HttpUrl)
            obj_dict = obj.model_dump(mode="json") if hasattr(obj, "model_dump") else obj.dict()
            obj_properties = {}
            for k, v in obj_dict.items():
                # Skip nested Pydantic objects (represented as dicts after model_dump)
                if not isinstance(v, dict):
                    obj_properties[k] = v
            obj_properties.update(properties)
            properties = obj_properties
        else:
            # Legacy signature: node_type_or_obj is the node_type string
            node_type = node_type_or_obj

        self._graph_service.create_node(
            node_type=node_type, key_prop=key_prop, key_value=key_value, **properties
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
        from_type_or_obj,
        from_key_or_to_obj,
        from_value_or_rel_type=None,
        to_type=None,
        to_key=None,
        to_value=None,
        rel_type=None,
    ) -> None:
        """
        Create a relationship between two nodes.

        This method now uses the GraphService for improved performance and
        better separation of concerns.

        Best Practice - Use Pydantic objects directly:
            The simplest way is to pass two Pydantic objects and the relationship type:

            ```python
            # Best: pass Pydantic objects directly
            self.create_relationship(individual, domain, "HAS_DOMAIN")
            self.create_relationship(email, breach, "FOUND_IN_BREACH")
            ```

        Legacy Usage:
            You can still use the explicit signature for backward compatibility:

            ```python
            # Legacy: explicit signature
            self.create_relationship(
                "individual", "full_name", individual.full_name,
                "domain", "domain", domain_name,
                "HAS_DOMAIN"
            )
            ```

        Args:
            from_type_or_obj: Either a Pydantic object (source node) or source node label string
            from_key_or_to_obj: Either a Pydantic object (target node) or source node key property
            from_value_or_rel_type: Either relationship type string (if using objects) or source node key value
            to_type: Target node label (only for legacy signature)
            to_key: Target node key property (only for legacy signature)
            to_value: Target node key value (only for legacy signature)
            rel_type: Relationship type (only for legacy signature)
        """
        # Check if using new signature (Pydantic objects)
        if isinstance(from_type_or_obj, BaseModel) and isinstance(from_key_or_to_obj, BaseModel):
            from_obj = from_type_or_obj
            to_obj = from_key_or_to_obj
            relationship_type = from_value_or_rel_type

            # Extract from_node info
            from_node_type = from_obj.__class__.__name__.lower()
            from_primary_field = self._get_primary_field(from_obj)

            # Use model_dump to properly serialize Pydantic types (e.g., HttpUrl)
            from_obj_dict = from_obj.model_dump(mode="json") if hasattr(from_obj, "model_dump") else from_obj.dict()
            from_key_value = from_obj_dict.get(from_primary_field)

            # If key_value is still a dict (nested Pydantic model), extract its primary value
            if isinstance(from_key_value, dict):
                # Get the raw nested object to extract its primary value
                nested_obj = getattr(from_obj, from_primary_field)
                if isinstance(nested_obj, BaseModel):
                    from_key_value = self._extract_primary_value(nested_obj)

            # Extract to_node info
            to_node_type = to_obj.__class__.__name__.lower()
            to_primary_field = self._get_primary_field(to_obj)

            # Use model_dump to properly serialize Pydantic types (e.g., HttpUrl)
            to_obj_dict = to_obj.model_dump(mode="json") if hasattr(to_obj, "model_dump") else to_obj.dict()
            to_key_value = to_obj_dict.get(to_primary_field)

            # If key_value is still a dict (nested Pydantic model), extract its primary value
            if isinstance(to_key_value, dict):
                # Get the raw nested object to extract its primary value
                nested_obj = getattr(to_obj, to_primary_field)
                if isinstance(nested_obj, BaseModel):
                    to_key_value = self._extract_primary_value(nested_obj)

            self._graph_service.create_relationship(
                from_type=from_node_type,
                from_key=from_primary_field,
                from_value=from_key_value,
                to_type=to_node_type,
                to_key=to_primary_field,
                to_value=to_key_value,
                rel_type=relationship_type,
            )
        else:
            # Legacy signature
            self._graph_service.create_relationship(
                from_type=from_type_or_obj,
                from_key=from_key_or_to_obj,
                from_value=from_value_or_rel_type,
                to_type=to_type,
                to_key=to_key,
                to_value=to_value,
                rel_type=rel_type,
            )

    def _get_primary_field(self, obj: BaseModel) -> str:
        """Helper method to get the primary field of a Pydantic object."""
        # Access model_fields from the class, not the instance
        model_fields = obj.__class__.model_fields

        # Find the primary field (marked with json_schema_extra={"primary": True})
        primary_field = None
        for field_name, field_info in model_fields.items():
            if field_info.json_schema_extra and field_info.json_schema_extra.get("primary"):
                primary_field = field_name
                break

        # Fallback: use first required field or first field
        if primary_field is None:
            for field_name, field_info in model_fields.items():
                if field_info.is_required():
                    primary_field = field_name
                    break
            if primary_field is None:
                primary_field = next(iter(model_fields.keys()))

        return primary_field

    def _extract_primary_value(self, obj: BaseModel) -> Any:
        """
        Extract the primitive value from a Pydantic object recursively.
        If the primary field is itself a Pydantic object, recursively extract its primary value.
        Uses model_dump to properly serialize Pydantic types like HttpUrl.
        """
        primary_field = self._get_primary_field(obj)

        # Use model_dump to properly serialize Pydantic types (e.g., HttpUrl)
        obj_dict = obj.model_dump(mode="json") if hasattr(obj, "model_dump") else obj.dict()
        value = obj_dict.get(primary_field)

        # If the value is still a dict (nested Pydantic model), recursively extract
        if isinstance(value, dict):
            # Get the raw nested object to recursively extract
            nested_obj = getattr(obj, primary_field)
            if isinstance(nested_obj, BaseModel):
                return self._extract_primary_value(nested_obj)

        return value

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
