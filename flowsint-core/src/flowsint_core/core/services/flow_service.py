"""
Flow service for managing flows and flow computations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Flow, CustomType, Sketch
from ..types import FlowBranch, FlowEdge, FlowNode, FlowStep
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError


class FlowService(BaseService):
    """
    Service for flow CRUD operations and flow computations.
    """

    def get_all_flows(
        self, category: Optional[str], user_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Get all flows, optionally filtered by category.

        Args:
            category: Optional category filter
            user_id: The user's ID

        Returns:
            List of flows
        """
        if not category or category.lower() == "undefined":
            return self._db.query(Flow).order_by(Flow.last_updated_at.desc()).all()

        # Check if category is a custom type
        custom_type = (
            self._db.query(CustomType)
            .filter(
                CustomType.owner_id == user_id,
                CustomType.status == "published",
                func.lower(CustomType.name) == category.lower(),
            )
            .first()
        )

        if custom_type:
            flows = self._db.query(Flow).order_by(Flow.last_updated_at.desc()).all()
            return [
                {
                    **(flow.to_dict() if hasattr(flow, "to_dict") else flow.__dict__),
                    "wobblyType": True,
                }
                for flow in flows
            ]

        # Filter by category
        flows = self._db.query(Flow).order_by(Flow.last_updated_at.desc()).all()
        return [
            flow
            for flow in flows
            if any(cat.lower() == category.lower() for cat in flow.category)
        ]

    def get_by_id(self, flow_id: UUID) -> Flow:
        """
        Get a flow by ID.

        Args:
            flow_id: The flow ID

        Returns:
            The flow

        Raises:
            NotFoundError: If flow not found
        """
        flow = self._db.query(Flow).filter(Flow.id == flow_id).first()
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
        """
        Create a new flow.

        Args:
            name: Flow name
            description: Flow description
            category: List of categories
            flow_schema: Flow schema (nodes and edges)

        Returns:
            The created flow
        """
        new_flow = Flow(
            id=uuid4(),
            name=name,
            description=description,
            category=category,
            flow_schema=flow_schema,
            created_at=datetime.utcnow(),
            last_updated_at=datetime.utcnow(),
        )
        self._add(new_flow)
        self._commit()
        self._refresh(new_flow)
        return new_flow

    def update(
        self, flow_id: UUID, updates: Dict[str, Any]
    ) -> Flow:
        """
        Update a flow.

        Args:
            flow_id: The flow ID
            updates: Dictionary of updates

        Returns:
            The updated flow

        Raises:
            NotFoundError: If flow not found
        """
        flow = self._db.query(Flow).filter(Flow.id == flow_id).first()
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
        """
        Delete a flow.

        Args:
            flow_id: The flow ID

        Raises:
            NotFoundError: If flow not found
        """
        flow = self._db.query(Flow).filter(Flow.id == flow_id).first()
        if not flow:
            raise NotFoundError("Flow not found")

        self._delete(flow)
        self._commit()

    def get_sketch_for_launch(self, sketch_id: str, user_id: UUID) -> Sketch:
        """
        Get sketch for flow launch with permission check.

        Args:
            sketch_id: The sketch ID
            user_id: The user's ID

        Returns:
            The sketch

        Raises:
            NotFoundError: If sketch not found
            PermissionDeniedError: If user doesn't have permission
        """
        sketch = self._db.query(Sketch).filter(Sketch.id == sketch_id).first()
        if not sketch:
            raise NotFoundError("Sketch not found")

        self._check_permission(user_id, sketch.investigation_id, ["update"])
        return sketch


def create_flow_service(db: Session) -> FlowService:
    """
    Factory function to create a FlowService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured FlowService instance
    """
    return FlowService(db=db)
