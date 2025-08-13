import pytest
import uuid
from unittest.mock import Mock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import Profile, Key
from flowsint_core.core.vault import Vault


@pytest.fixture(scope="function")
def test_db_session():
    """Create an in-memory SQLite database for testing"""
    # Create in-memory SQLite database
    engine = create_engine("sqlite:///:memory:", echo=False)

    # Only create specific tables we need for testing (to avoid ARRAY type issues)
    Profile.__table__.create(engine)
    Key.__table__.create(engine)

    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    yield session

    # Clean up
    session.close()
    engine.dispose()


@pytest.fixture(scope="function")
def test_owner_id():
    """Generate a test owner ID"""
    return uuid.uuid4()


@pytest.fixture(scope="function")
def test_profile(test_db_session, test_owner_id):
    """Create a test profile in the database"""
    profile = Profile(
        id=test_owner_id,
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="hashed_test_password",
        is_active=True,
        first_name="Test",
        last_name="User",
    )

    test_db_session.add(profile)
    test_db_session.commit()
    test_db_session.refresh(profile)

    return profile


@pytest.fixture(scope="function")
def test_api_key(test_db_session, test_owner_id):
    """Create a test API key in the database"""
    key = Key(
        id=uuid.uuid4(),
        name="test_etherscan_key",
        owner_id=test_owner_id,
        encrypted_key="test_api_key_12345",
    )

    test_db_session.add(key)
    test_db_session.commit()
    test_db_session.refresh(key)

    return key


@pytest.fixture(scope="function")
def test_vault(test_db_session, test_owner_id, test_profile, test_api_key):
    """Create a test vault instance with test data"""
    return Vault(db=test_db_session, owner_id=test_owner_id)


@pytest.fixture(scope="function")
def mock_logger():
    """Create a mock logger for testing"""
    logger = Mock()
    logger.info = Mock()
    logger.error = Mock()
    logger.warn = Mock()
    logger.debug = Mock()
    logger.success = Mock()
    return logger


@pytest.fixture(scope="function")
def test_sketch_scan_ids():
    """Generate test sketch and scan IDs"""
    return {"sketch_id": str(uuid.uuid4()), "scan_id": str(uuid.uuid4())}


@pytest.fixture(scope="function")
def multiple_test_keys(test_db_session, test_owner_id):
    """Create multiple test API keys for comprehensive testing"""
    keys = []

    # Create keys with different names
    key_configs = [
        {"name": "etherscan_api_key", "value": "test_etherscan_key_123"},
        {"name": "another_service_key", "value": "test_another_key_456"},
        {"name": "vaultKey1", "value": "test_vault_key_789"},
    ]

    for config in key_configs:
        key = Key(
            id=uuid.uuid4(),
            name=config["name"],
            owner_id=test_owner_id,
            encrypted_key=config["value"],
        )
        test_db_session.add(key)
        keys.append(key)

    test_db_session.commit()

    for key in keys:
        test_db_session.refresh(key)

    return keys


@pytest.fixture(scope="function")
def test_vault_with_multiple_keys(
    test_db_session, test_owner_id, test_profile, multiple_test_keys
):
    """Create a test vault with multiple keys for comprehensive testing"""
    return Vault(db=test_db_session, owner_id=test_owner_id)
