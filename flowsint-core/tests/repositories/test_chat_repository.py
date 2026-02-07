"""Tests for ChatRepository."""
from datetime import datetime, timezone
from uuid import uuid4

from tests.factories import (
    ChatFactory,
    ChatMessageFactory,
    InvestigationFactory,
    ProfileFactory,
)
from flowsint_core.core.models import ChatMessage
from flowsint_core.core.repositories import ChatRepository


class TestChatRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        InvestigationFactory._meta.sqlalchemy_session = db_session
        ChatFactory._meta.sqlalchemy_session = db_session
        ChatMessageFactory._meta.sqlalchemy_session = db_session

    def test_get_by_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        ChatFactory(owner=user, investigation=inv)
        ChatFactory(owner=user, investigation=inv)

        other = ProfileFactory()
        other_inv = InvestigationFactory(owner=other)
        ChatFactory(owner=other, investigation=other_inv)

        repo = ChatRepository(db_session)
        results = repo.get_by_owner(user.id)

        assert len(results) == 2

    def test_get_by_investigation_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        ChatFactory(owner=user, investigation=inv)

        other_inv = InvestigationFactory(owner=user)
        ChatFactory(owner=user, investigation=other_inv)

        repo = ChatRepository(db_session)
        results = repo.get_by_investigation_and_owner(inv.id, user.id)

        assert len(results) == 1

    def test_get_by_id_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        chat = ChatFactory(owner=user, investigation=inv)

        repo = ChatRepository(db_session)
        result = repo.get_by_id_and_owner(chat.id, user.id)

        assert result is not None
        assert result.id == chat.id

    def test_get_by_id_and_owner_wrong_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        chat = ChatFactory(owner=user, investigation=inv)
        other = ProfileFactory()

        repo = ChatRepository(db_session)
        result = repo.get_by_id_and_owner(chat.id, other.id)

        assert result is None

    def test_add_message(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        chat = ChatFactory(owner=user, investigation=inv)

        repo = ChatRepository(db_session)
        message = ChatMessage(
            id=uuid4(),
            content="hello",
            chat_id=chat.id,
            is_bot=False,
            created_at=datetime.now(timezone.utc),
        )
        repo.add_message(message)
        db_session.commit()

        refreshed = repo.get_by_id(chat.id)
        assert len(refreshed.messages) == 1

    def test_delete(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        inv = InvestigationFactory(owner=user)
        chat = ChatFactory(owner=user, investigation=inv)

        repo = ChatRepository(db_session)
        repo.delete(chat)
        db_session.commit()

        assert repo.get_by_id(chat.id) is None
