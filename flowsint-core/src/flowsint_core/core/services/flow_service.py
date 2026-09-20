"""
Flow service for managing flows and flow computations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from ..models import Flow, Sketch
from ..repositories import (
    CustomTypeRepository,
    FlowRepository,
    InvestigationRepository,
    SketchRepository,
)
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError
from .sketch_access import resolve_sketch_for_launch


class FlowService(BaseService):
    """
    Service for flow CRUD operations and flow computations.
    """

    def __init__(
        self,
        db: Session,
        flow_repo: FlowRepository,
        custom_type_repo: CustomTypeRepository,
        sketch_repo: SketchRepository,
        investigation_repo: InvestigationRepository,
        **kwargs: Any,
    ):
        super().__init__(db, **kwargs)
        self._flow_repo = flow_repo
        self._custom_type_repo = custom_type_repo
        self._sketch_repo = sketch_repo
        self._investigation_repo = investigation_repo

    def get_all_flows(self, category: Optional[str], user_id: UUID) -> List[Flow]:
        if not category or category.lower() == "undefined":
            return self._flow_repo.get_all_with_optional_category(None, user_id)

        # Check if category is a custom type
        custom_type = self._custom_type_repo.get_published_by_name_and_owner(
            category, user_id
        )

        if custom_type:
            return []

        return self._flow_repo.get_all_with_optional_category(category, user_id)

    def get_by_id(self, flow_id: UUID, user_id: UUID) -> Flow:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")
        if flow.owner_id is not None and flow.owner_id != user_id:
            raise PermissionDeniedError("Forbidden")
        return flow

    def create(
        self,
        name: str,
        description: Optional[str],
        category: List[str],
        flow_schema: Dict[str, Any],
        owner_id: UUID,
    ) -> Flow:
        new_flow = Flow(
            id=uuid4(),
            name=name,
            description=description,
            category=category,
            flow_schema=flow_schema,
            owner_id=owner_id,
            created_at=datetime.now(timezone.utc),
            last_updated_at=datetime.now(timezone.utc),
        )
        self._flow_repo.add(new_flow)
        self._commit()
        self._refresh(new_flow)
        return new_flow

    def update(self, flow_id: UUID, user_id: UUID, updates: Dict[str, Any]) -> Flow:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")
        if flow.owner_id != user_id:
            raise PermissionDeniedError("Forbidden")

        for key, value in updates.items():
            if key == "category":
                if "SocialAccount" in value:
                    value.append("Username")
            setattr(flow, key, value)

        flow.last_updated_at = datetime.now(timezone.utc)
        self._commit()
        self._refresh(flow)
        return flow

    def delete(self, flow_id: UUID, user_id: UUID) -> None:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")
        if flow.owner_id != user_id:
            raise PermissionDeniedError("Forbidden")

        self._flow_repo.delete(flow)
        self._commit()

    def get_sketch_for_launch(self, sketch_id: str, user_id: UUID) -> Sketch:
        return resolve_sketch_for_launch(
            self._sketch_repo, self._check_permission, sketch_id, user_id
        )


def create_flow_service(db: Session) -> FlowService:
    investigation_repo = InvestigationRepository(db)
    return FlowService(
        db=db,
        flow_repo=FlowRepository(db),
        custom_type_repo=CustomTypeRepository(db),
        sketch_repo=SketchRepository(db),
        investigation_repo=investigation_repo,
    )
