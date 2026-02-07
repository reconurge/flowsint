"""Tests for KeyRepository."""
from uuid import uuid4

from tests.factories import KeyFactory, ProfileFactory
from flowsint_core.core.repositories import KeyRepository


class TestKeyRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        KeyFactory._meta.sqlalchemy_session = db_session

    def test_get_by_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        KeyFactory(owner=user)
        KeyFactory(owner=user)

        other = ProfileFactory()
        KeyFactory(owner=other)

        repo = KeyRepository(db_session)
        results = repo.get_by_owner(user.id)

        assert len(results) == 2

    def test_get_by_id_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        key = KeyFactory(owner=user)

        repo = KeyRepository(db_session)
        result = repo.get_by_id_and_owner(key.id, user.id)

        assert result is not None
        assert result.name == key.name

    def test_get_by_id_and_owner_wrong_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        key = KeyFactory(owner=user)
        other = ProfileFactory()

        repo = KeyRepository(db_session)
        result = repo.get_by_id_and_owner(key.id, other.id)

        assert result is None

    def test_delete(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        key = KeyFactory(owner=user)

        repo = KeyRepository(db_session)
        repo.delete(key)
        db_session.commit()

        assert repo.get_by_id(key.id) is None
