from typing import Literal, Optional

from pydantic import BaseModel, Field


class TemplateInput(BaseModel):
    type: str = Field(..., description="Flowsint Type to the template takes as input")
    key: str = Field(
        default="nodeLabel",
        description="Flowsint Type to the template takes as input",
    )


class TemplateHttpRequestHeader(BaseModel):
    name: str = Field(min_length=1, max_length=256, pattern=r"^[A-Za-z0-9\-]+$")
    value: str = Field(min_length=1, max_length=4096)

    class Config:
        extra = "forbid"
        frozen = True


class TemplateHttpRequestParams(BaseModel):
    key: str = Field(min_length=1, max_length=256, pattern=r"^[A-Za-z0-9\-]+$")
    value: str = Field(min_length=1, max_length=4096)

    class Config:
        extra = "forbid"
        frozen = True


class TemplateHttpRequest(BaseModel):
    method: Literal["GET", "POST"]
    url: str
    headers: dict = Field(default_factory=dict)
    params: dict = Field(default_factory=dict)
    body: Optional[str] = None

    class Config:
        extra = "forbid"
        frozen = True


class TemplateHttpResponseMapping(BaseModel):
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

    class Config:
        extra = "forbid"
        frozen = True


class TemplateHttpResponse(BaseModel):
    expect: Literal["json", "xml", "text"]
    map: dict = Field(default_factory=dict)

    class Config:
        extra = "forbid"
        frozen = True


class Template(BaseModel):
    name: str = Field(..., description="Name of the template")
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
