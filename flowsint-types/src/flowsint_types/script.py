from pydantic import BaseModel, Field
from typing import Optional, List


class Script(BaseModel):
    """Represents a script or code file with analysis and security information."""

    script_id: str = Field(
        ..., description="Unique script identifier", title="Script ID"
    )
    name: Optional[str] = Field(None, description="Script name", title="Name")
    language: Optional[str] = Field(
        None, description="Programming language", title="Language"
    )
    type: Optional[str] = Field(
        None, description="Type of script (JavaScript, Python, etc.)", title="Type"
    )
    content: Optional[str] = Field(None, description="Script content", title="Content")
    file_path: Optional[str] = Field(
        None, description="File path if stored", title="File Path"
    )
    url: Optional[str] = Field(None, description="URL if loaded from web", title="URL")
    hash_md5: Optional[str] = Field(None, description="MD5 hash", title="MD5 Hash")
    hash_sha1: Optional[str] = Field(None, description="SHA1 hash", title="SHA1 Hash")
    hash_sha256: Optional[str] = Field(
        None, description="SHA256 hash", title="SHA256 Hash"
    )
    file_size: Optional[int] = Field(
        None, description="File size in bytes", title="File Size"
    )
    created_date: Optional[str] = Field(
        None, description="Creation date", title="Created Date"
    )
    modified_date: Optional[str] = Field(
        None, description="Last modified date", title="Modified Date"
    )
    author: Optional[str] = Field(None, description="Script author", title="Author")
    version: Optional[str] = Field(None, description="Script version", title="Version")
    description: Optional[str] = Field(
        None, description="Script description", title="Description"
    )
    dependencies: Optional[List[str]] = Field(
        None, description="Script dependencies", title="Dependencies"
    )
    functions: Optional[List[str]] = Field(
        None, description="Functions defined in script", title="Functions"
    )
    is_malicious: Optional[bool] = Field(
        None, description="Whether script is malicious", title="Is Malicious"
    )
    malware_family: Optional[str] = Field(
        None, description="Malware family if malicious", title="Malware Family"
    )
    threat_level: Optional[str] = Field(
        None, description="Threat level assessment", title="Threat Level"
    )
    source: Optional[str] = Field(
        None, description="Source of script information", title="Source"
    )
    obfuscated: Optional[bool] = Field(
        None, description="Whether script is obfuscated", title="Obfuscated"
    )
    minified: Optional[bool] = Field(
        None, description="Whether script is minified", title="Minified"
    )
