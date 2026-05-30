"""Tests for timezone-aware service timestamps."""

from datetime import timezone
from unittest.mock import MagicMock
from uuid import uuid4

from flowsint_core.core.services.analysis_service import AnalysisService
from flowsint_core.core.services.chat_service import ChatService
from flowsint_core.core.services.flow_service import FlowService


def _assert_utc(value):
    assert value.tzinfo is not None
    assert value.utcoffset() == timezone.utc.utcoffset(value)


def test_analysis_service_create_uses_timezone_aware_timestamps():
    service = AnalysisService(
        db=MagicMock(),
        analysis_repo=MagicMock(),
        investigation_repo=MagicMock(),
    )
    service._check_permission = MagicMock()

    analysis = service.create(
        title="Summary",
        description=None,
        content={},
        investigation_id=uuid4(),
        owner_id=uuid4(),
    )

    _assert_utc(analysis.created_at)
    _assert_utc(analysis.last_updated_at)


def test_chat_service_create_uses_timezone_aware_timestamps():
    service = ChatService(
        db=MagicMock(),
        chat_repo=MagicMock(),
        vault_service=MagicMock(),
    )

    chat = service.create(
        title="Investigation chat",
        description=None,
        investigation_id=uuid4(),
        owner_id=uuid4(),
    )

    _assert_utc(chat.created_at)
    _assert_utc(chat.last_updated_at)


def test_flow_service_create_uses_timezone_aware_timestamps():
    service = FlowService(
        db=MagicMock(),
        flow_repo=MagicMock(),
        custom_type_repo=MagicMock(),
        sketch_repo=MagicMock(),
        investigation_repo=MagicMock(),
    )

    flow = service.create(
        name="Resolve domain",
        description=None,
        category=["Domain"],
        flow_schema={"nodes": [], "edges": []},
    )

    _assert_utc(flow.created_at)
    _assert_utc(flow.last_updated_at)
