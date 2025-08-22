from pydantic import BaseModel, Field
from typing import Optional, List


class Document(BaseModel):
    """Represents a document with metadata, security, and content information."""

    title: str = Field(..., description="Document title", title="Title")
    doc_type: Optional[str] = Field(
        None, description="Type of document (PDF, DOC, etc.)", title="Document Type"
    )
    file_size: Optional[int] = Field(
        None, description="File size in bytes", title="File Size"
    )
    created_date: Optional[str] = Field(
        None, description="Document creation date", title="Created Date"
    )
    modified_date: Optional[str] = Field(
        None, description="Document last modified date", title="Modified Date"
    )
    author: Optional[str] = Field(None, description="Document author", title="Author")
    subject: Optional[str] = Field(
        None, description="Document subject", title="Subject"
    )
    keywords: Optional[List[str]] = Field(
        None, description="Document keywords", title="Keywords"
    )
    language: Optional[str] = Field(
        None, description="Document language", title="Language"
    )
    page_count: Optional[int] = Field(
        None, description="Number of pages", title="Page Count"
    )
    hash_md5: Optional[str] = Field(None, description="MD5 hash", title="MD5 Hash")
    hash_sha1: Optional[str] = Field(None, description="SHA1 hash", title="SHA1 Hash")
    hash_sha256: Optional[str] = Field(
        None, description="SHA256 hash", title="SHA256 Hash"
    )
    source_url: Optional[str] = Field(
        None, description="Source URL if downloaded", title="Source URL"
    )
    location: Optional[str] = Field(
        None, description="File location or path", title="Location"
    )
    is_encrypted: Optional[bool] = Field(
        None, description="Whether document is encrypted", title="Is Encrypted"
    )
    is_password_protected: Optional[bool] = Field(
        None,
        description="Whether document is password protected",
        title="Is Password Protected",
    )
    description: Optional[str] = Field(
        None, description="Document description", title="Description"
    )
    source: Optional[str] = Field(
        None, description="Source of document information", title="Source"
    )
