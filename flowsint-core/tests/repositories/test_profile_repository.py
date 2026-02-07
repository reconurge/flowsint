"""Tests for ProfileRepository."""
from uuid import uuid4

from tests.factories import ProfileFactory
from flowsint_core.core.repositories import ProfileRepository


class TestProfileRepository:
    def test_get_by_id(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        profile = ProfileFactory()

        repo = ProfileRepository(db_session)
        result = repo.get_by_id(profile.id)

        assert result is not None
        assert result.id == profile.id
        assert result.email == profile.email

    def test_get_by_id_not_found(self, db_session):
        repo = ProfileRepository(db_session)
        result = repo.get_by_id(uuid4())
        assert result is None

    def test_get_by_email(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        profile = ProfileFactory(email="find@test.com")

        repo = ProfileRepository(db_session)
        result = repo.get_by_email("find@test.com")

        assert result is not None
        assert result.id == profile.id

    def test_get_by_email_not_found(self, db_session):
        repo = ProfileRepository(db_session)
        result = repo.get_by_email("nonexistent@test.com")
        assert result is None

    def test_add(self, db_session):
        from flowsint_core.core.models import Profile

        repo = ProfileRepository(db_session)
        profile = Profile(
            id=uuid4(), email="new@test.com", hashed_password="pw"
        )
        repo.add(profile)
        db_session.commit()

        result = repo.get_by_email("new@test.com")
        assert result is not None

    def test_delete(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        profile = ProfileFactory()

        repo = ProfileRepository(db_session)
        repo.delete(profile)
        db_session.commit()

        assert repo.get_by_id(profile.id) is None

    def test_get_all(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        ProfileFactory()
        ProfileFactory()

        repo = ProfileRepository(db_session)
        results = repo.get_all()
        assert len(results) == 2
