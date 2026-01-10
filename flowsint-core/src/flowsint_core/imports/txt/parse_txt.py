from typing import Dict

from ..types import Entity, FileParseResult
from ..utils import create_entity_preview


def parse_txt(
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

        entities: Dict[str, Entity] = {}

        for _, line in enumerate(lines[:max_preview_rows]):
            entity = create_entity_preview(line)
            if entity:
                if entity.detected_type in entities:
                    entities[entity.detected_type].results.append(entity)
                else:
                    entities[entity.detected_type] = Entity(
                        type=entity.detected_type, results=[entity]
                    )
        return FileParseResult(
            entities=entities,
            total_entities=len(lines),
        )

    except Exception as e:
        # Normalize exceptions to ValueError for callers/tests
        raise ValueError(f"Failed to parse TXT file: {str(e)}")
