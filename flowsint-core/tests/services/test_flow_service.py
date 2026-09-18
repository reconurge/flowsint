"""Tests for FlowService.get_sketch_for_launch.

This used to hand-roll the same resolve-then-check logic as
EnricherService.get_sketch_for_launch, and the two copies drifted: this one
never parsed sketch_id to a UUID before handing it to the repository, so a
malformed id crashed instead of denying. Both now share
sketch_access.resolve_sketch_for_launch -- these tests pin the behavior on
this caller.
"""

from uuid import uuid4

import pytest

from flowsint_core.core.services.exceptions import NotFoundError, PermissionDeniedError
from flowsint_core.core.services.flow_service import create_flow_service
from flowsint_core.core.types import Role
from tests.factories import (
    InvestigationFactory,
    InvestigationUserRoleFactory,
    ProfileFactory,
    SketchFactory,
)


def _setup(db_session):
    ProfileFactory._meta.sqlalchemy_session = db_session
    InvestigationFactory._meta.sqlalchemy_session = db_session
    InvestigationUserRoleFactory._meta.sqlalchemy_session = db_session
    SketchFactory._meta.sqlalchemy_session = db_session


class TestGetSketchForLaunch:
    def test_malformed_sketch_id_is_denied_not_crashed(self, db_session):
        _setup(db_session)
        service = create_flow_service(db_session)

        with pytest.raises(NotFoundError):
            service.get_sketch_for_launch("not-a-uuid", uuid4())

    def test_unknown_sketch_id_is_denied(self, db_session):
        _setup(db_session)
        service = create_flow_service(db_session)

        with pytest.raises(NotFoundError):
            service.get_sketch_for_launch(str(uuid4()), uuid4())

    def test_user_without_a_role_is_forbidden(self, db_session):
        _setup(db_session)
        sketch = SketchFactory()
        service = create_flow_service(db_session)

        with pytest.raises(PermissionDeniedError):
            service.get_sketch_for_launch(str(sketch.id), uuid4())

    def test_a_viewer_is_forbidden(self, db_session):
        _setup(db_session)
        sketch = SketchFactory()
        role = InvestigationUserRoleFactory(
            investigation=sketch.investigation, roles=[Role.VIEWER]
        )
        service = create_flow_service(db_session)

        with pytest.raises(PermissionDeniedError):
            service.get_sketch_for_launch(str(sketch.id), role.user_id)

    def test_an_editor_can_launch(self, db_session):
        _setup(db_session)
        sketch = SketchFactory()
        role = InvestigationUserRoleFactory(
            investigation=sketch.investigation, roles=[Role.EDITOR]
        )
        service = create_flow_service(db_session)

        resolved = service.get_sketch_for_launch(str(sketch.id), role.user_id)

        assert resolved.id == sketch.id
