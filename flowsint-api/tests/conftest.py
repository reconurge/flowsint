"""Pytest harness for flowsint-api. Provides a TestClient backed by an
in-memory SQLite database, overriding the real Postgres get_db dependency."""

import os

# Env required at import time by flowsint-core modules. Set before importing app.
os.environ.setdefault("AUTH_SECRET", "test-secret-please-ignore")
os.environ.setdefault(
    "MASTER_VAULT_KEY_V1", "base64:qnHTmwYb+uoygIw9MsRMY22vS5YPchY+QOi/E79GAvM="
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from flowsint_core.core.models import Base
from flowsint_core.core.postgre_db import get_db
from app.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()
