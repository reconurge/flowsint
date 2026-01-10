import re
from typing import Optional

from .entity_detection import detect_type
from .types import EntityPreview


def camel_to_screaming_snake(name):
    s1 = re.sub(r"(?<!^)(?=[A-Z])", "_", name)
    return s1.upper()


def create_entity_preview(row_value: str) -> Optional[EntityPreview]:
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
