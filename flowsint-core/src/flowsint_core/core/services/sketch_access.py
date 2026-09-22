"""Shared sketch-resolution logic for services that launch work into a sketch."""

from typing import Callable, List
from uuid import UUID

from ..models import Sketch
from ..repositories import SketchRepository
from .exceptions import NotFoundError


def resolve_sketch_for_launch(
    sketch_repo: SketchRepository,
    check_permission: Callable[[UUID, UUID, List[str]], bool],
    sketch_id: str,
    user_id: UUID,
) -> Sketch:
    """Resolve the sketch a launch will write into, denying anyone without
    update rights on its investigation.

    A sketch_id that isn't a valid UUID names no sketch, so it's denied the
    same way as a missing one -- never surfaced as a 500 from the repository's
    UUID bind. Single source of truth: this used to be copy-pasted per
    service, and the copies drifted (one parsed the id, the other didn't).
    """
    try:
        parsed_id = UUID(sketch_id)
    except (ValueError, TypeError, AttributeError):
        raise NotFoundError("Sketch not found")

    sketch = sketch_repo.get_by_id(parsed_id)
    if not sketch:
        raise NotFoundError("Sketch not found")

    check_permission(user_id, sketch.investigation_id, ["update"])
    return sketch
