"""
File parsing utilities for entity imports.
Handles TXT file format only.
Each line represents ONE entity with a single value.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, BinaryIO, Union, Optional
from pathlib import Path
from .entity_detection import detect_type


@dataclass
class EntityPreview:
    """Preview of a single entity to be imported."""

    obj: Dict[str, Any]
    detected_type: str


@dataclass
class Entity:
    """Entity class"""

    type: str
    results: List[EntityPreview]


@dataclass
class FileParseResult:
    """Result of parsing an import file."""

    entities: Dict[str, Entity]
    total_entities: int


def parse_import_file(
    file_content: Union[bytes, BinaryIO],
    filename: str,
    max_preview_rows: int = 100,
) -> FileParseResult:
    """
    Parse an uploaded TXT file and analyze its contents.
    """
    file_ext = Path(filename).suffix.lower()

    # Convert file content to bytes if it's a file-like object
    if hasattr(file_content, "read"):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content

    # Only support TXT files
    if file_ext != ".txt":
        raise ValueError(
            f"Unsupported file format: {file_ext}. Only .txt files are supported."
        )

    return _parse_txt(file_bytes, max_preview_rows)


def _parse_txt(
    file_bytes: bytes,
    max_preview_rows: int,
) -> FileParseResult:
    """Parse a TXT file where each line is an entity with a single string value."""
    try:
        # Try to decode as UTF-8, fall back to latin-1
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_bytes.decode("latin-1")

        # Split by lines and filter empty lines
        lines = [line.strip() for line in text_content.split("\n")]
        lines = [line for line in lines if line]

        if not lines:
            raise ValueError("File is empty")

        total_rows = len(lines)

        entities: Dict[str, Entity] = {}

        for _, line in enumerate(lines[:max_preview_rows]):
            entity = _create_entity_preview(line)
            if entity:
                if entity.detected_type in entities:
                    entities[entity.detected_type].results.append(entity)
                else:
                    entities[entity.detected_type] = Entity(
                        type=entity.detected_type, results=[entity]
                    )
        return FileParseResult(
            entities=entities,
            total_entities=total_rows,
        )

    except Exception as e:
        # Normalize exceptions to ValueError for callers/tests
        raise ValueError(f"Failed to parse TXT file: {str(e)}")


def _create_entity_preview(row_value: str) -> Optional[EntityPreview]:
    """
    Create an EntityPreview from a row of data.

    Args:
        row_value: string value of the entry
    Returns:
        EntityPreview or None if row is invalid
    """
    # Detect entity type (detect_type may return a class with from_string or None)
    DetectedType = detect_type(row_value)

    # If detection failed (None), provide a minimal Unknown type with from_string
    if not DetectedType:

        class UnknownType:
            @classmethod
            def from_string(cls, value: str):
                # fallback: return raw string or a minimal wrapper
                return value

        DetectedType = UnknownType
        detected_name = "Unknown"
    else:
        # If detect_type returned a class/type, try to get a readable name
        detected_name = getattr(DetectedType, "__name__", str(DetectedType))

    # Build object using the type's from_string (expect classmethod)
    try:
        obj = DetectedType.from_string(row_value)
    except Exception:
        # On failure converting to object, return None to skip the row
        return None

    return EntityPreview(
        obj=obj,
        detected_type=detected_name,
    )
