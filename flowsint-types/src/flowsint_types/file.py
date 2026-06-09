import re

from pydantic import Field, model_validator
from typing import Optional, Self

from .flowsint_base import FlowsintType
from .registry import flowsint_type

# Map of hex-hash length -> the File field that should hold it.
_HASH_LENGTH_TO_FIELD = {
    32: "hash_md5",
    40: "hash_sha1",
    64: "hash_sha256",
}
_HASH_RE = re.compile(r"^[0-9a-fA-F]+$")


def _hash_field_for(value: str) -> Optional[str]:
    """Return the File hash field name for an MD5/SHA1/SHA256 hex string, else None."""
    value = value.strip()
    if not _HASH_RE.match(value):
        return None
    return _HASH_LENGTH_TO_FIELD.get(len(value))


@flowsint_type
class File(FlowsintType):
    """Represents a file with metadata, type information, and security assessment."""

    filename: str = Field(..., description="File name", title="Filename", json_schema_extra={"primary": True})
    file_type: Optional[str] = Field(
        None, description="File type or extension", title="File Type"
    )
    file_size: Optional[int] = Field(
        None, description="File size in bytes", title="File Size"
    )
    created_date: Optional[str] = Field(
        None, description="File creation date", title="Created Date"
    )
    modified_date: Optional[str] = Field(
        None, description="File last modified date", title="Modified Date"
    )
    accessed_date: Optional[str] = Field(
        None, description="File last accessed date", title="Accessed Date"
    )
    path: Optional[str] = Field(None, description="File path", title="Path")
    hash_md5: Optional[str] = Field(None, description="MD5 hash", title="MD5 Hash")
    hash_sha1: Optional[str] = Field(None, description="SHA1 hash", title="SHA1 Hash")
    hash_sha256: Optional[str] = Field(
        None, description="SHA256 hash", title="SHA256 Hash"
    )
    is_executable: Optional[bool] = Field(
        None, description="Whether file is executable", title="Is Executable"
    )
    is_archive: Optional[bool] = Field(
        None, description="Whether file is an archive", title="Is Archive"
    )
    is_image: Optional[bool] = Field(
        None, description="Whether file is an image", title="Is Image"
    )
    is_video: Optional[bool] = Field(
        None, description="Whether file is a video", title="Is Video"
    )
    is_audio: Optional[bool] = Field(
        None, description="Whether file is an audio file", title="Is Audio"
    )
    is_text: Optional[bool] = Field(
        None, description="Whether file is a text file", title="Is Text"
    )
    mime_type: Optional[str] = Field(None, description="MIME type", title="MIME Type")
    description: Optional[str] = Field(
        None, description="File description", title="Description"
    )
    source: Optional[str] = Field(
        None, description="Source of file information", title="Source"
    )
    is_malicious: Optional[bool] = Field(
        None, description="Whether file is malicious", title="Is Malicious"
    )
    malware_family: Optional[str] = Field(
        None, description="Malware family if malicious", title="Malware Family"
    )
    threat_level: Optional[str] = Field(
        None, description="Threat level assessment", title="Threat Level"
    )

    @model_validator(mode='after')
    def compute_label(self) -> Self:
        self.nodeLabel = self.filename
        return self

    @classmethod
    def from_string(cls, line: str):
        """Parse a file from a raw string.

        If the value is an MD5/SHA1/SHA256 hash, store it in the matching
        hash field as well as the filename (so the node keeps a label).
        """
        line = line.strip()
        hash_field = _hash_field_for(line)
        if hash_field:
            return cls(filename=line, **{hash_field: line.lower()})
        return cls(filename=line)

    @classmethod
    def detect(cls, line: str) -> bool:
        """Detect a file hash (MD5 / SHA1 / SHA256) from a single line.

        Only hashes are auto-detected; arbitrary filenames are too ambiguous
        to detect reliably, so non-hash values still return False.
        """
        return _hash_field_for(line) is not None
