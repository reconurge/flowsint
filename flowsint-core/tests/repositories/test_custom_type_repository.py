"""Tests for CustomTypeRepository."""
from tests.factories import CustomTypeFactory, ProfileFactory
from flowsint_core.core.repositories import CustomTypeRepository


class TestCustomTypeRepository:
    def _setup(self, db_session):
        ProfileFactory._meta.sqlalchemy_session = db_session
        CustomTypeFactory._meta.sqlalchemy_session = db_session

    def test_get_by_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        CustomTypeFactory(owner=user)
        CustomTypeFactory(owner=user)

        other = ProfileFactory()
        CustomTypeFactory(owner=other)

        repo = CustomTypeRepository(db_session)
        results = repo.get_by_owner(user.id)

        assert len(results) == 2

    def test_get_by_owner_with_status(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        CustomTypeFactory(owner=user, status="draft")
        CustomTypeFactory(owner=user, status="published")

        repo = CustomTypeRepository(db_session)
        results = repo.get_by_owner(user.id, status="published")

        assert len(results) == 1

    def test_get_by_id_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        ct = CustomTypeFactory(owner=user)

        repo = CustomTypeRepository(db_session)
        result = repo.get_by_id_and_owner(ct.id, user.id)

        assert result is not None
        assert result.name == ct.name

    def test_get_by_id_and_owner_wrong_user(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        ct = CustomTypeFactory(owner=user)
        other = ProfileFactory()

        repo = CustomTypeRepository(db_session)
        result = repo.get_by_id_and_owner(ct.id, other.id)

        assert result is None

    def test_get_by_name_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        CustomTypeFactory(owner=user, name="MyType")

        repo = CustomTypeRepository(db_session)
        result = repo.get_by_name_and_owner("MyType", user.id)

        assert result is not None
        assert result.name == "MyType"

    def test_get_by_name_and_owner_not_found(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()

        repo = CustomTypeRepository(db_session)
        result = repo.get_by_name_and_owner("NoSuch", user.id)

        assert result is None

    def test_get_published_by_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        CustomTypeFactory(owner=user, status="draft")
        CustomTypeFactory(owner=user, status="published")
        CustomTypeFactory(owner=user, status="published")

        repo = CustomTypeRepository(db_session)
        results = repo.get_published_by_owner(user.id)

        assert len(results) == 2

    def test_get_published_by_name_and_owner(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        CustomTypeFactory(owner=user, name="Vehicle", status="published")
        CustomTypeFactory(owner=user, name="Vehicle", status="draft")

        repo = CustomTypeRepository(db_session)
        result = repo.get_published_by_name_and_owner("vehicle", user.id)

        assert result is not None
        assert result.status == "published"

    def test_delete(self, db_session):
        self._setup(db_session)
        user = ProfileFactory()
        ct = CustomTypeFactory(owner=user)

        repo = CustomTypeRepository(db_session)
        repo.delete(ct)
        db_session.commit()

        assert repo.get_by_id(ct.id) is None
