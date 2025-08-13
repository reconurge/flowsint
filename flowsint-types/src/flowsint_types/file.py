from pydantic import BaseModel, Field
from typing import Optional, List


class File(BaseModel):
    """Represents a file with metadata, type information, and security assessment."""

    filename: str = Field(..., description="File name", title="Filename")
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
