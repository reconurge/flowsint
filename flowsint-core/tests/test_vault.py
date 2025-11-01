"""Tests for the Vault class and secret management."""
import pytest
import uuid
import os
from unittest.mock import Mock, MagicMock
from flowsint_core.core.vault import Vault
from flowsint_core.core.models import Key


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return Mock()


@pytest.fixture
def owner_id():
    """Create a test owner ID."""
    return uuid.uuid4()


@pytest.fixture
def vault(mock_db, owner_id):
    """Create a Vault instance with mocked database."""
    return Vault(db=mock_db, owner_id=owner_id)


@pytest.fixture(autouse=True)
def mock_master_key(monkeypatch):
    """Mock the master key environment variable."""
    # Use a base64-encoded 32-byte key
    test_key = "base64:qnHTmwYb+uoygIw9MsRMY22vS5YPchY+QOi/E79GAvM="
    monkeypatch.setenv("MASTER_VAULT_KEY_V1", test_key)


class TestVaultInitialization:
    """Tests for Vault initialization."""

    def test_vault_requires_owner_id(self, mock_db):
        """Test that Vault requires an owner_id."""
        with pytest.raises(ValueError, match="owner_id is required"):
            Vault(db=mock_db, owner_id=None)

    def test_vault_initialization_success(self, mock_db, owner_id):
        """Test successful Vault initialization."""
        vault = Vault(db=mock_db, owner_id=owner_id)
        assert vault.db == mock_db
        assert vault.owner_id == str(owner_id)
        assert vault.version == "V1"


class TestVaultSetSecret:
    """Tests for Vault.set_secret() method."""

    def test_set_secret_creates_key(self, vault, mock_db):
        """Test that set_secret creates a new Key in the database."""
        vault_ref = "TEST_API_KEY"
        plain_key = "my-secret-api-key-12345"

        vault.set_secret(vault_ref, plain_key)

        # Verify that db.add, db.commit, and db.refresh were called
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_db.refresh.called

        # Get the Key object that was added
        added_key = mock_db.add.call_args[0][0]
        assert isinstance(added_key, Key)
        assert added_key.name == vault_ref
        assert added_key.owner_id == vault.owner_id
        assert added_key.key_version == "V1"
        assert added_key.iv is not None
        assert added_key.salt is not None
        assert added_key.ciphertext is not None

    def test_set_secret_encrypts_data(self, vault, mock_db):
        """Test that set_secret properly encrypts the secret."""
        vault_ref = "TEST_API_KEY"
        plain_key = "my-secret-api-key-12345"

        vault.set_secret(vault_ref, plain_key)

        added_key = mock_db.add.call_args[0][0]

        # Ciphertext should not contain the plaintext
        assert plain_key.encode() not in added_key.ciphertext
        # IV and salt should be different lengths (12 and 16 bytes)
        assert len(added_key.iv) == 12
        assert len(added_key.salt) == 16


class TestVaultGetSecret:
    """Tests for Vault.get_secret() method."""

    def test_get_secret_by_name_found(self, vault, mock_db, owner_id):
        """Test getting a secret by name when it exists."""
        vault_ref = "TEST_API_KEY"
        plain_key = "my-secret-api-key-12345"

        # Set a secret first to get encrypted data
        real_vault = Vault(db=MagicMock(), owner_id=owner_id)
        encrypted_data = real_vault._encrypt_key(plain_key)

        # Create a mock Key object
        mock_key = Mock()
        mock_key.name = vault_ref
        mock_key.id = uuid.uuid4()
        mock_key.owner_id = str(owner_id)
        mock_key.salt = encrypted_data["salt"]
        mock_key.iv = encrypted_data["iv"]
        mock_key.ciphertext = encrypted_data["ciphertext"]

        # Mock the database query
        mock_result = Mock()
        mock_result.scalars().first.return_value = mock_key
        mock_db.execute.return_value = mock_result

        # Get the secret
        result = vault.get_secret(vault_ref)

        assert result == plain_key
        assert mock_db.execute.called

    def test_get_secret_by_uuid_found(self, vault, mock_db, owner_id):
        """Test getting a secret by UUID when it exists."""
        key_id = uuid.uuid4()
        plain_key = "my-secret-api-key-12345"

        # Set a secret first to get encrypted data
        real_vault = Vault(db=MagicMock(), owner_id=owner_id)
        encrypted_data = real_vault._encrypt_key(plain_key)

        # Create a mock Key object
        mock_key = Mock()
        mock_key.name = "TEST_API_KEY"
        mock_key.id = key_id
        mock_key.owner_id = str(owner_id)
        mock_key.salt = encrypted_data["salt"]
        mock_key.iv = encrypted_data["iv"]
        mock_key.ciphertext = encrypted_data["ciphertext"]

        # Mock the database query
        mock_result = Mock()
        mock_result.scalars().first.return_value = mock_key
        mock_db.execute.return_value = mock_result

        # Get the secret by UUID
        result = vault.get_secret(str(key_id))

        assert result == plain_key
        assert mock_db.execute.called

    def test_get_secret_not_found(self, vault, mock_db):
        """Test getting a secret that doesn't exist."""
        vault_ref = "NONEXISTENT_KEY"

        # Mock the database query to return None
        mock_result = Mock()
        mock_result.scalars().first.return_value = None
        mock_db.execute.return_value = mock_result

        result = vault.get_secret(vault_ref)

        assert result is None

    def test_get_secret_wrong_owner(self, vault, mock_db):
        """Test that secrets from other owners cannot be accessed."""
        vault_ref = "TEST_API_KEY"

        # Mock the database query to return None (no key found for this owner)
        mock_result = Mock()
        mock_result.scalars().first.return_value = None
        mock_db.execute.return_value = mock_result

        result = vault.get_secret(vault_ref)

        assert result is None


class TestVaultEncryptionDecryption:
    """Tests for encryption and decryption methods."""

    def test_encrypt_decrypt_roundtrip(self, vault):
        """Test that encryption and decryption work correctly."""
        plaintext = "my-secret-api-key-12345"

        # Encrypt
        encrypted_data = vault._encrypt_key(plaintext)

        assert "ciphertext" in encrypted_data
        assert "iv" in encrypted_data
        assert "salt" in encrypted_data
        assert plaintext.encode() not in encrypted_data["ciphertext"]

        # Decrypt
        decrypted = vault._decrypt_key(encrypted_data)

        assert decrypted == plaintext

    def test_different_salts_produce_different_ciphertexts(self, vault):
        """Test that the same plaintext with different salts produces different ciphertexts."""
        plaintext = "my-secret-api-key-12345"

        encrypted1 = vault._encrypt_key(plaintext)
        encrypted2 = vault._encrypt_key(plaintext)

        # Different salts and IVs
        assert encrypted1["salt"] != encrypted2["salt"]
        assert encrypted1["iv"] != encrypted2["iv"]
        # Different ciphertexts
        assert encrypted1["ciphertext"] != encrypted2["ciphertext"]

    def test_master_key_derivation(self, vault):
        """Test that master key is properly derived."""
        master_key = vault._get_master_key()

        assert isinstance(master_key, bytes)
        assert len(master_key) == 32  # 256 bits

    def test_invalid_master_key_length(self, vault, monkeypatch):
        """Test that invalid master key length raises error."""
        # Set an invalid master key (wrong length)
        monkeypatch.setenv("MASTER_VAULT_KEY_V1", "base64:invalid")

        with pytest.raises(ValueError, match="Master key must be 32 bytes"):
            vault._get_master_key()

    def test_missing_master_key(self, vault, monkeypatch):
        """Test that missing master key raises error."""
        monkeypatch.delenv("MASTER_VAULT_KEY_V1", raising=False)

        with pytest.raises(ValueError, match="Missing master key"):
            vault._get_master_key()
