"""
Flow service for managing flows and flow computations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy.orm import Session

from ..models import Flow, Sketch
from ..repositories import (
    FlowRepository,
    CustomTypeRepository,
    SketchRepository,
    InvestigationRepository,
)
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


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
        **kwargs,
    ):
        super().__init__(db, **kwargs)
        self._flow_repo = flow_repo
        self._custom_type_repo = custom_type_repo
        self._sketch_repo = sketch_repo
        self._investigation_repo = investigation_repo

    def get_all_flows(
        self, category: Optional[str], user_id: UUID
    ) -> List[Dict[str, Any]]:
        if not category or category.lower() == "undefined":
            return self._flow_repo.get_all_with_optional_category(None)

        # Check if category is a custom type
        custom_type = self._custom_type_repo.get_published_by_name_and_owner(
            category, user_id
        )

        if custom_type:
            flows = self._flow_repo.get_all_with_optional_category(None)
            return [
                {
                    **(flow.to_dict() if hasattr(flow, "to_dict") else flow.__dict__),
                    "wobblyType": True,
                }
                for flow in flows
            ]

        return self._flow_repo.get_all_with_optional_category(category)

    def get_by_id(self, flow_id: UUID) -> Flow:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")
        return flow

    def create(
        self,
        name: str,
        description: Optional[str],
        category: List[str],
        flow_schema: Dict[str, Any],
    ) -> Flow:
        new_flow = Flow(
            id=uuid4(),
            name=name,
            description=description,
            category=category,
            flow_schema=flow_schema,
            created_at=datetime.utcnow(),
            last_updated_at=datetime.utcnow(),
        )
        self._flow_repo.add(new_flow)
        self._commit()
        self._refresh(new_flow)
        return new_flow

    def update(
        self, flow_id: UUID, updates: Dict[str, Any]
    ) -> Flow:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")

        for key, value in updates.items():
            if key == "category":
                if "SocialAccount" in value:
                    value.append("Username")
            setattr(flow, key, value)

        flow.last_updated_at = datetime.utcnow()
        self._commit()
        self._refresh(flow)
        return flow

    def delete(self, flow_id: UUID) -> None:
        flow = self._flow_repo.get_by_id(flow_id)
        if not flow:
            raise NotFoundError("Flow not found")

        self._flow_repo.delete(flow)
        self._commit()

    def get_sketch_for_launch(self, sketch_id: str, user_id: UUID) -> Sketch:
        sketch = self._sketch_repo.get_by_id(sketch_id)
        if not sketch:
            raise NotFoundError("Sketch not found")

        self._check_permission(user_id, sketch.investigation_id, ["update"])
        return sketch


def create_flow_service(db: Session) -> FlowService:
    investigation_repo = InvestigationRepository(db)
    return FlowService(
        db=db,
        flow_repo=FlowRepository(db),
        custom_type_repo=CustomTypeRepository(db),
        sketch_repo=SketchRepository(db),
        investigation_repo=investigation_repo,
    )
