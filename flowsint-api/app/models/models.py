import uuid

from sqlalchemy import (
    String, Text, DateTime, ForeignKey,
    Index, func, text, JSON
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    content = mapped_column(Text, nullable=True)
    owner_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    name = mapped_column(Text)
    description = mapped_column(Text)
    owner_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=True)
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    status = mapped_column(String, server_default='active')
    sketches = relationship("Sketch", back_populates="investigation")
    __table_args__ = (
        Index("idx_investigations_id", "id"),
        Index("idx_investigations_owner_id", "owner_id"),
    )


class InvestigationsProfiles(Base):
    __tablename__ = "investigations_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    investigation_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"))
    profile_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"))
    role = mapped_column(String, server_default="member")

    __table_args__ = (
        Index("idx_investigations_profiles_investigation_id", "investigation_id"),
        Index("idx_investigations_profiles_profile_id", "profile_id"),
        # Uniqueness constraint
        Index("projects_profiles_unique_profile_project", "profile_id", "investigation_id", unique=True),
    )


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=True)
    content = mapped_column(Text)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    sketch_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=True)
    type = mapped_column(String, server_default="INFO")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = mapped_column(Text, nullable=True)
    last_name = mapped_column(Text, nullable=True)
    avatar_url = mapped_column(Text, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    status = mapped_column(String, nullable=True)
    results = mapped_column(JSON, nullable=True)
    values = mapped_column(ARRAY(Text), nullable=True)
    sketch_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=True)

    __table_args__ = (
        Index("idx_scans_sketch_id", "sketch_id"),
    )


class Sketch(Base):
    __tablename__ = "sketches"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = mapped_column(Text)
    description = mapped_column(Text)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=True)
    status = mapped_column(String, server_default="active")
    investigation_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("investigations.id", onupdate="CASCADE", ondelete="CASCADE"))
    investigation = relationship("Investigation", back_populates="sketches")
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_sketches_investigation_id", "investigation_id"),
        Index("idx_sketches_owner_id", "owner_id"),
    )


class SketchesProfiles(Base):
    __tablename__ = "sketches_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    profile_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("profiles.id", onupdate="CASCADE", ondelete="CASCADE"))
    sketch_id = mapped_column(PGUUID(as_uuid=True), ForeignKey("sketches.id", onupdate="CASCADE", ondelete="CASCADE"))
    role = mapped_column(String, server_default="editor")

    __table_args__ = (
        Index("idx_sketches_profiles_sketch_id", "sketch_id"),
        Index("idx_sketches_profiles_profile_id", "profile_id"),
        Index("investigations_profiles_unique_profile_investigation", "profile_id", "sketch_id", unique=True),
    )


class Transform(Base):
    __tablename__ = "transforms"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    category = mapped_column(ARRAY(Text), nullable=True)
    transform_schema = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_updated_at = mapped_column(DateTime(timezone=True), server_default=func.now())