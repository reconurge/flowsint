from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class TemplateInput(BaseModel):
    type: str = Field(..., description="Flowsint Type the template takes as input")
    key: str = Field(
        default="nodeLabel",
        description="Key attribute to extract from input type for template variables",
    )


class TemplateOutput(BaseModel):
    type: str = Field(
        ..., description="Flowsint Type that the template should return as an output."
    )
    # If response is an array, this allows mapping each item to an output
    is_array: bool = Field(
        default=False,
        description="Whether the response is an array that should produce multiple outputs",
    )
    array_path: Optional[str] = Field(
        default=None,
        description="Dot-notation path to array in response (e.g., 'data.results')",
    )


class TemplateHttpRequestHeader(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1, max_length=256, pattern=r"^[A-Za-z0-9\-]+$")
    value: str = Field(min_length=1, max_length=4096)


class TemplateHttpRequestParams(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    key: str = Field(min_length=1, max_length=256, pattern=r"^[A-Za-z0-9\-]+$")
    value: str = Field(min_length=1, max_length=4096)


class TemplateRetryConfig(BaseModel):
    """Configuration for retry behavior on failed requests."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    max_retries: int = Field(
        default=3, ge=0, le=10, description="Maximum number of retry attempts"
    )
    backoff_factor: float = Field(
        default=0.5,
        ge=0.1,
        le=10.0,
        description="Multiplier for exponential backoff (seconds)",
    )
    retry_on_status: List[int] = Field(
        default=[429, 500, 502, 503, 504],
        description="HTTP status codes that should trigger a retry",
    )


class TemplateSecret(BaseModel):
    """Definition of a secret/variable that can be injected from vault."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Name of the secret (used as {{secrets.NAME}} in template)",
    )
    required: bool = Field(
        default=True, description="Whether this secret is required for the template"
    )
    description: Optional[str] = Field(
        default=None, description="Description of what this secret is used for"
    )


class TemplateHttpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    method: Literal["GET", "POST"] = Field(
        default="GET", description="HTTP method for the request"
    )
    url: str = Field(..., description="URL template with {{variable}} placeholders")
    headers: dict = Field(
        default_factory=dict,
        description="HTTP headers (values can contain {{variable}} placeholders)",
    )
    params: dict = Field(
        default_factory=dict,
        description="Query parameters (values can contain {{variable}} placeholders)",
    )
    body: Optional[str] = Field(
        default=None,
        description="Request body for POST requests (can contain {{variable}} placeholders)",
    )
    timeout: float = Field(
        default=30.0,
        ge=1.0,
        le=300.0,
        description="Request timeout in seconds",
    )


class TemplateHttpResponseMapping(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    key: str = Field(
        min_length=1,
        max_length=256,
        pattern=r"^[A-Za-z0-9\-]+$",
        description="The key (from the response format) to map.",
    )
    value: str = Field(
        min_length=1,
        max_length=4096,
        description="The key of the field you want to feed (of the expected FlowsintType).",
    )


class TemplateHttpResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    expect: Literal["json", "xml", "text"] = Field(
        default="json", description="Expected response format"
    )
    # Map supports dot notation for nested paths: "data.user.name"
    map: dict = Field(
        default_factory=dict,
        description="Mapping from output field names to response paths (supports dot notation)",
    )


class Template(BaseModel):
    name: str = Field(..., description="Name of the template")
    description: Optional[str] = Field(None, description="Description of the template")
    category: str = Field(..., description="Category of the template")
    version: float = Field(..., description="Version of the template")
    input: TemplateInput = Field(
        ...,
        description="Input format of the template, with key to use (default to nodeLabel)",
    )
    request: TemplateHttpRequest = Field(
        ..., description="Request model for the HTTP request to be made."
    )
    response: TemplateHttpResponse = Field(
        ..., description="Response model for the HTTP response to expect."
    )
    output: TemplateOutput = Field(
        ...,
        description="Output type of the template.",
    )
    # Optional configurations
    secrets: List[TemplateSecret] = Field(
        default_factory=list,
        description="List of secrets required by this template (fetched from vault)",
    )
    retry: Optional[TemplateRetryConfig] = Field(
        default=None, description="Retry configuration for failed requests"
    )
