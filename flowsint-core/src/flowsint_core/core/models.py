import uuid
from datetime import datetime
from flowsint_core.core.types import Role
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    func,
    JSON,
    Column,
    Enum as SQLEnum,
    LargeBinary,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from flowsint_core.core.enums import EventLevel


class Base(DeclarativeBase):
    pass


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    content = mapped_column(Text, nullable=True)
    owner_id = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    name = mapped_column(Text)
    description = mapped_column(Text)
    owner_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    status = mapped_column(String, server_default="active")
    sketches = relationship("Sketch", back_populates="investigation")
    analyses = relationship("Analysis", back_populates="investigation")
    chats = relationship("Chat", back_populates="investigation")
    owner = relationship("Profile", foreign_keys=[owner_id])
    user_roles = relationship(
        "InvestigationUserRole",
        back_populates="investigation",
        passive_deletes=True,
        cascade="save-update, merge",
    )
    __table_args__ = (
        Index("idx_investigations_id", "id"),
        Index("idx_investigations_owner_id", "owner_id"),
    )


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    content = mapped_column(JSONB, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    sketch_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    type = Column(SQLEnum(EventLevel), default=EventLevel.INFO)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name = mapped_column(Text, nullable=True)
    last_name = mapped_column(Text, nullable=True)
    avatar_url = mapped_column(Text, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    investigation_roles = relationship("InvestigationUserRole", back_populates="user")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sketch_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    status = Column(SQLEnum(EventLevel), default=EventLevel.PENDING)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

    # Relationships
    sketch = relationship("Sketch", back_populates="scans")

    def __repr__(self):
        return f"<Scan(id={self.id}, status={self.status})>"


class Sketch(Base):
    __tablename__ = "sketches"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title = mapped_column(Text)
    description = mapped_column(Text)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    status = mapped_column(String, server_default="active")
    investigation_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"),
    )
    investigation = relationship("Investigation", back_populates="sketches")
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    scans = relationship("Scan", back_populates="sketch")

    __table_args__ = (
        Index("idx_sketches_investigation_id", "investigation_id"),
        Index("idx_sketches_owner_id", "owner_id"),
    )


class SketchesProfiles(Base):
    __tablename__ = "sketches_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    profile_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
    )
    sketch_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"),
    )
    role = mapped_column(String, server_default="editor")

    __table_args__ = (
        Index("idx_sketches_profiles_sketch_id", "sketch_id"),
        Index("idx_sketches_profiles_profile_id", "profile_id"),
        Index(
            "investigations_profiles_unique_profile_investigation",
            "profile_id",
            "sketch_id",
            unique=True,
        ),
    )


class Flow(Base):
    __tablename__ = "flows"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    category = mapped_column(ARRAY(Text), nullable=True)
    flow_schema = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    content = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    investigation_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    investigation = relationship("Investigation", back_populates="analyses")

    __table_args__ = (
        Index("idx_analyses_owner_id", "owner_id"),
        Index("idx_analyses_investigation_id", "investigation_id"),
    )


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    investigation_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    investigation = relationship("Investigation", back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete")
    __table_args__ = (
        Index("idx_chats_owner_id", "owner_id"),
        Index("idx_chats_investigation_id", "investigation_id"),
    )


class ChatMessage(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    content = mapped_column(JSON, nullable=True)
    context = mapped_column(JSON, nullable=True)
    is_bot: Mapped[bool] = mapped_column(default=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    chat_id = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("chats.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    chat = relationship("Chat", back_populates="messages")
    __table_args__ = (Index("idx_messages_chat_id", "chat_id"),)


class Key(Base):
    __tablename__ = "keys"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String, nullable=False)  # ex: "shodan", "whocy"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    iv: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # 12 bytes
    salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # 16/32 bytes
    key_version: Mapped[str] = mapped_column(String, nullable=False)  # ex: "V1"

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_keys_owner_id", "owner_id"),
        Index("idx_keys_service", "name"),
    )


class InvestigationUserRole(Base):
    __tablename__ = "investigation_user_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    investigation_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    roles: Mapped[list[Role]] = mapped_column(
        ARRAY(SQLEnum(Role, name="role_enum", create_constraint=True)),
        nullable=False,
        server_default="{}",
    )

    # Relations ORM
    user = relationship(
        "Profile", back_populates="investigation_roles", passive_deletes=True
    )
    investigation = relationship(
        "Investigation", back_populates="user_roles", passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("user_id", "investigation_id", name="uq_user_investigation"),
        Index("idx_investigation_roles_user_id", "user_id"),
        Index("idx_investigation_roles_investigation_id", "investigation_id"),
    )


class CustomType(Base):
    __tablename__ = "custom_types"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    schema: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String, server_default="draft", nullable=False)
    checksum: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("Profile", foreign_keys=[owner_id])

    __table_args__ = (
        Index("idx_custom_types_owner_id", "owner_id"),
        Index("idx_custom_types_name", "name"),
        Index("idx_custom_types_status", "status"),
    )
