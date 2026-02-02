from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, TypeAdapter, ValidationError, create_model
from pydantic.config import ConfigDict

from ..utils import resolve_type
from .graph import GraphService, create_graph_service
from .logger import Logger
from .vault import VaultProtocol


class InvalidEnricherParams(Exception):
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


class Enricher(ABC):
    """
    Abstract base class for all enrichers.

    ## InputType and OutputType Pattern

    Enrichers only need to define InputType and OutputType as class attributes.
    The base class automatically handles schema generation:

    ```python
    from typing import List
    from flowsint_types import Domain
    from flowsint_types import Ip

    class MyEnricher(Enricher):
        # Define types as class attributes (base types, not lists)
        InputType = Domain
        OutputType = Ip

        @classmethod
        def name(cls):
            return "my_enricher"

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
    InputType = MyEnricher.InputType
    OutputType = MyEnricher.OutputType
    ```

    The base class automatically provides:
    - Generic preprocess() that validates inputs using InputType
    - input_schema() method using InputType
    - output_schema() method using OutputType
    - Error handling for missing type definitions
    - Consistent schema generation across all enrichers

    Subclasses can override input_schema() or output_schema() if needed for special cases.
    """

    # Abstract type aliases that must be defined in subclasses for runtime use
    InputType = NotImplemented
    OutputType = NotImplemented

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        params_schema: Optional[List[Dict[str, Any]]] = None,
        vault: Optional[VaultProtocol] = None,
        params: Optional[Dict[str, Any]] = None,
        graph_service: Optional[GraphService] = None,
    ):
        self.scan_id = scan_id or "default"
        self.sketch_id = sketch_id or "system"
        self.vault = vault
        self.params_schema = params_schema or []
        self.ParamsModel = build_params_model(self.params_schema)
        self.params: Dict[str, Any] = params or {}

        # Initialize graph service (uses singleton connection by default)
        if graph_service:
            self._graph_service = graph_service
        else:
            self._graph_service = create_graph_service(
                sketch_id=self.sketch_id,
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
            raise InvalidEnricherParams(
                f"Enricher '{self.name()}' received invalid parameters: {e}"
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
        """Primary key on which the enricher operates (e.g. domain, IP, etc.)"""
        pass

    @classmethod
    def documentation(cls) -> str:
        """
        Return formatted markdown documentation for this enricher.
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
                if isinstance(item, str) and primary_field:
                    item = {primary_field: item}

                validated = adapter.validate_python(item)
                cleaned.append(validated)
            except Exception:
                continue

        return cleaned

    def postprocess(
        self, results: List[Dict[str, Any]], input_data: List[str] = None
    ) -> List[Dict[str, Any]]:
        return results

    async def execute(self, values: List[Any]) -> List[Dict[str, Any]]:
        if self.name() != "enricher_orchestrator":
            Logger.info(self.sketch_id, {"message": f"Enricher {self.name()} started."})
        try:
            await self.async_init()
            preprocessed = self.preprocess(values)
            results = await self.scan(preprocessed)
            processed = self.postprocess(results, preprocessed)

            # Flush any pending batch operations
            self._graph_service.flush()

            if self.name() != "enricher_orchestrator":
                Logger.completed(
                    self.sketch_id, {"message": f"Enricher {self.name()} finished."}
                )

            return processed

        except Exception as e:
            if self.name() != "enricher_orchestrator":
                Logger.error(
                    self.sketch_id,
                    {"message": f"Enricher {self.name()} errored: {str(e)}"},
                )
            return []

    def create_node(self, node_obj) -> None:
        """
        Create a single Neo4j node.

        The following properties are automatically added to every node:
        - type: Lowercase version of node_type
        - sketch_id: Current sketch ID from enricher context
        - label: Automatically computed by FlowsintType, or defaults to key_value if not provided
        - created_at: ISO 8601 UTC timestamp (only on creation, not updates)

        Use Pydantic object directly:
            ```python
            self.create_node(ip)
            ```

        Args:
            node_obj: Either a Pydantic object or node label string
            **properties: Additional node properties or overrides
        """
        self._graph_service.create_node_from_flowsint_type(node_obj=node_obj)

    def create_relationship(
        self,
        from_obj,
        to_obj,
        rel_label="IS_RELATED_TO",
    ) -> None:
        """
        Create a relationship between two nodes.

        Best Practice - Use Pydantic objects directly:
            ```python
            self.create_relationship(individual, domain, "HAS_DOMAIN")
            self.create_relationship(email, breach, "FOUND_IN_BREACH")
            ```

        Args:
            from_obj: Either a Pydantic object (source) or source node label
            to_obj: Either a Pydantic object (target) or source node key property
            rel_label: Either relationship type (Pydantic) or source node key value
        """
        self._graph_service.create_relationship(
            from_obj=from_obj, to_obj=to_obj, rel_label=rel_label
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
