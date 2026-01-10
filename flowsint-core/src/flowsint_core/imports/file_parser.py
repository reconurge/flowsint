"""
File parsing utilities for entity imports.
Handles TXT file format only.
Each line represents ONE entity with a single value.
"""

from pathlib import Path
from typing import BinaryIO, Optional, Union

from .json import parse_json
from .txt import parse_txt
from .types import FileParseResult

ALLOWED_EXTENSIONS = [".txt", ".json"]


def parse_import_file(
    file_content: Optional[Union[bytes, BinaryIO]],
    filename: Optional[str],
    max_preview_rows: int = 100,
) -> FileParseResult | None:
    """
    Parse an uploaded file and analyze its contents.
    """

    file_ext = Path(filename).suffix.lower()

    # Convert file content to bytes if it's a file-like object
    if hasattr(file_content, "read"):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content

    # Only supported files
    if file_ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format: {file_ext}. Only those files extensions are supported: {', '.join(ALLOWED_EXTENSIONS)} "
        )

    if file_ext == ".txt":
        return parse_txt(file_bytes, max_preview_rows)
    elif file_ext in [".json"]:
        return parse_json(file_bytes, max_preview_rows)
