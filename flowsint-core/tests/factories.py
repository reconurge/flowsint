"""FactoryBoy factories for all models."""
from datetime import datetime, timezone
from uuid import uuid4

import factory
from factory.alchemy import SQLAlchemyModelFactory

from flowsint_core.core.enums import EventLevel
from flowsint_core.core.models import (
    Analysis,
    Chat,
    ChatMessage,
    CustomType,
    Flow,
    Investigation,
    InvestigationUserRole,
    Key,
    Log,
    Profile,
    Scan,
    Sketch,
)
from flowsint_core.core.types import Role


class ProfileFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Profile
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    email = factory.Sequence(lambda n: f"user{n}@test.com")
    hashed_password = factory.LazyFunction(lambda: "hashed_pw")
    is_active = True


class InvestigationFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Investigation
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"Investigation {n}")
    description = "Test description"
    owner = factory.SubFactory(ProfileFactory)
    owner_id = factory.LazyAttribute(lambda o: o.owner.id)
    status = "active"


class InvestigationUserRoleFactory(SQLAlchemyModelFactory):
    class Meta:
        model = InvestigationUserRole
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    user = factory.SubFactory(ProfileFactory)
    user_id = factory.LazyAttribute(lambda o: o.user.id)
    investigation = factory.SubFactory(InvestigationFactory)
    investigation_id = factory.LazyAttribute(lambda o: o.investigation.id)
    roles = factory.LazyFunction(lambda: [Role.OWNER])


class SketchFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Sketch
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    title = factory.Sequence(lambda n: f"Sketch {n}")
    description = "Test sketch"
    owner_id = factory.LazyAttribute(lambda o: o.investigation.owner_id)
    investigation = factory.SubFactory(InvestigationFactory)
    investigation_id = factory.LazyAttribute(lambda o: o.investigation.id)
    status = "active"


class AnalysisFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Analysis
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    title = factory.Sequence(lambda n: f"Analysis {n}")
    description = "Test analysis"
    content = factory.LazyFunction(lambda: {"data": "test"})
    owner_id = factory.LazyAttribute(lambda o: o.investigation.owner_id)
    investigation = factory.SubFactory(InvestigationFactory)
    investigation_id = factory.LazyAttribute(lambda o: o.investigation.id)


class ChatFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Chat
        sqlalchemy_session_persistence = "commit"
        exclude = ["owner"]

    id = factory.LazyFunction(uuid4)
    title = factory.Sequence(lambda n: f"Chat {n}")
    description = "Test chat"
    owner = factory.SubFactory(ProfileFactory)
    owner_id = factory.LazyAttribute(lambda o: o.owner.id)
    investigation = factory.SubFactory(InvestigationFactory)
    investigation_id = factory.LazyAttribute(lambda o: o.investigation.id)


class ChatMessageFactory(SQLAlchemyModelFactory):
    class Meta:
        model = ChatMessage
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    content = factory.LazyFunction(lambda: "Test message")
    context = None
    is_bot = False
    chat = factory.SubFactory(ChatFactory)
    chat_id = factory.LazyAttribute(lambda o: o.chat.id)
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ScanFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Scan
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    sketch = factory.SubFactory(SketchFactory)
    sketch_id = factory.LazyAttribute(lambda o: o.sketch.id)
    status = EventLevel.PENDING
    started_at = factory.LazyFunction(datetime.utcnow)


class LogFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Log
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    content = factory.LazyFunction(lambda: {"message": "test log"})
    sketch_id = None
    type = EventLevel.INFO
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class KeyFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Key
        sqlalchemy_session_persistence = "commit"
        exclude = ["owner"]

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"key_{n}")
    owner = factory.SubFactory(ProfileFactory)
    owner_id = factory.LazyAttribute(lambda o: o.owner.id)
    ciphertext = b"encrypted_data"
    iv = b"123456789012"
    salt = b"1234567890123456"
    key_version = "V1"


class FlowFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Flow
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"Flow {n}")
    description = "Test flow"
    category = factory.LazyFunction(lambda: ["test"])
    flow_schema = factory.LazyFunction(lambda: {"nodes": [], "edges": []})


class CustomTypeFactory(SQLAlchemyModelFactory):
    class Meta:
        model = CustomType
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"CustomType{n}")
    owner = factory.SubFactory(ProfileFactory)
    owner_id = factory.LazyAttribute(lambda o: o.owner.id)
    schema = factory.LazyFunction(
        lambda: {"type": "object", "properties": {"value": {"type": "string"}}}
    )
    status = "draft"
    description = "Test custom type"
