"""Tests for Transform base class vault integration."""
import pytest
import uuid
from typing import List, Dict, Any
from unittest.mock import Mock, MagicMock, patch
from flowsint_core.core.transform_base import Transform


class MockTransform(Transform):
    """Mock transform for testing."""

    InputType = List[str]
    OutputType = List[str]

    @classmethod
    def name(cls) -> str:
        return "mock_transform"

    @classmethod
    def category(cls) -> str:
        return "Test"

    @classmethod
    def key(cls) -> str:
        return "test_key"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "name": "TEST_API_KEY",
                "type": "vaultSecret",
                "description": "Test API key",
                "required": True,
            },
            {
                "name": "OPTIONAL_KEY",
                "type": "vaultSecret",
                "description": "Optional key",
                "required": False,
                "default": "default_value",
            },
            {
                "name": "NON_VAULT_PARAM",
                "type": "string",
                "description": "Non-vault parameter",
                "required": False,
                "default": "test",
            },
        ]

    async def scan(self, data: InputType) -> OutputType:
        return data


@pytest.fixture
def mock_vault():
    """Create a mock vault instance."""
    vault = Mock()
    vault.get_secret = Mock()
    return vault


@pytest.fixture
def sketch_id():
    """Create a test sketch ID."""
    return str(uuid.uuid4())


@pytest.fixture
def transform(mock_vault, sketch_id):
    """Create a MockTransform instance with vault."""
    return MockTransform(
        sketch_id=sketch_id,
        scan_id="scan_123",
        vault=mock_vault,
        params={},
    )


class TestResolveParams:
    """Tests for resolve_params() method."""

    def test_resolve_vault_secret_by_name(self, transform, mock_vault):
        """Test resolving a vault secret by parameter name."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        resolved = transform.resolve_params()

        # Should try to get by name "TEST_API_KEY"
        assert mock_vault.get_secret.called
        assert "TEST_API_KEY" in resolved
        assert resolved["TEST_API_KEY"] == secret_value

    def test_resolve_vault_secret_by_id(self, transform, mock_vault):
        """Test resolving a vault secret by vault ID."""
        secret_value = "my-api-key-12345"
        vault_id = str(uuid.uuid4())

        # Set params with a vault ID
        transform.params = {"TEST_API_KEY": vault_id}

        # First call (by ID) returns the secret
        mock_vault.get_secret.return_value = secret_value

        resolved = transform.resolve_params()

        # Should try to get by ID first
        mock_vault.get_secret.assert_called_with(vault_id)
        assert "TEST_API_KEY" in resolved
        assert resolved["TEST_API_KEY"] == secret_value

    def test_resolve_vault_secret_fallback_to_name(self, transform, mock_vault):
        """Test that if vault ID fails, it falls back to name lookup."""
        secret_value = "my-api-key-12345"
        vault_id = str(uuid.uuid4())

        # Set params with a vault ID
        transform.params = {"TEST_API_KEY": vault_id}

        # First call (by ID) returns None, second call (by name) returns the secret
        mock_vault.get_secret.side_effect = [None, secret_value]

        resolved = transform.resolve_params()

        # Should try both ID and name
        assert mock_vault.get_secret.call_count == 2
        assert "TEST_API_KEY" in resolved
        assert resolved["TEST_API_KEY"] == secret_value

    def test_resolve_vault_secret_not_found_required(self, transform, mock_vault):
        """Test that missing required vault secret logs error."""
        mock_vault.get_secret.return_value = None

        with patch("flowsint_core.core.transform_base.Logger") as mock_logger:
            resolved = transform.resolve_params()

            # Should log an error for missing required secret
            assert mock_logger.error.called
            error_message = mock_logger.error.call_args[0][1]["message"]
            assert "TEST_API_KEY" in error_message
            assert "missing" in error_message.lower()
            assert "Vault settings" in error_message

            # Should not be in resolved params
            assert "TEST_API_KEY" not in resolved

    def test_resolve_vault_secret_optional_with_default(self, transform, mock_vault):
        """Test that optional vault secret uses default if not found."""
        # Only return secret for TEST_API_KEY, not OPTIONAL_KEY
        mock_vault.get_secret.side_effect = lambda key: (
            "test-api-key" if key == "TEST_API_KEY" else None
        )

        resolved = transform.resolve_params()

        # Optional key should use default value
        assert "OPTIONAL_KEY" in resolved
        assert resolved["OPTIONAL_KEY"] == "default_value"

    def test_resolve_non_vault_param_from_params(self, transform):
        """Test that non-vault params are taken from params."""
        transform.params = {"NON_VAULT_PARAM": "custom_value"}

        resolved = transform.resolve_params()

        assert "NON_VAULT_PARAM" in resolved
        assert resolved["NON_VAULT_PARAM"] == "custom_value"

    def test_resolve_non_vault_param_uses_default(self, transform):
        """Test that non-vault params use default if not provided."""
        resolved = transform.resolve_params()

        assert "NON_VAULT_PARAM" in resolved
        assert resolved["NON_VAULT_PARAM"] == "test"

    def test_resolve_params_no_vault_instance(self, sketch_id):
        """Test that resolve_params works without a vault instance."""
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=None,  # No vault
            params={},
        )

        resolved = transform.resolve_params()

        # Should use defaults for optional params
        assert "OPTIONAL_KEY" in resolved
        assert resolved["OPTIONAL_KEY"] == "default_value"
        assert "NON_VAULT_PARAM" in resolved
        assert resolved["NON_VAULT_PARAM"] == "test"


class TestGetSecret:
    """Tests for get_secret() method."""

    @pytest.mark.asyncio
    async def test_get_secret_found(self, transform, mock_vault):
        """Test get_secret when secret is in resolved params."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Run async_init to resolve params
        await transform.async_init()

        # Get the secret
        result = transform.get_secret("TEST_API_KEY")

        assert result == secret_value

    @pytest.mark.asyncio
    async def test_get_secret_not_found_uses_default(self, transform, mock_vault):
        """Test get_secret returns default when secret not found."""
        mock_vault.get_secret.return_value = None

        # Run async_init to resolve params
        await transform.async_init()

        # Get the secret with default
        result = transform.get_secret("NONEXISTENT_KEY", "default")

        assert result == "default"

    @pytest.mark.asyncio
    async def test_get_secret_returns_none_when_not_found_no_default(
        self, transform, mock_vault
    ):
        """Test get_secret returns None when no default provided."""
        mock_vault.get_secret.return_value = None

        # Run async_init to resolve params
        await transform.async_init()

        # Get the secret without default
        result = transform.get_secret("NONEXISTENT_KEY")

        assert result is None


class TestAsyncInit:
    """Tests for async_init() method."""

    @pytest.mark.asyncio
    async def test_async_init_calls_resolve_params(self, transform, mock_vault):
        """Test that async_init calls resolve_params."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Run async_init
        await transform.async_init()

        # Params should be resolved and stored
        assert "TEST_API_KEY" in transform.params
        assert transform.params["TEST_API_KEY"] == secret_value

    @pytest.mark.asyncio
    async def test_async_init_always_runs_resolve_params(self, sketch_id, mock_vault):
        """Test that async_init runs resolve_params even with empty params."""
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={},  # Empty params
        )

        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Run async_init
        await transform.async_init()

        # Should still resolve vault secrets by name
        assert mock_vault.get_secret.called
        assert "TEST_API_KEY" in transform.params

    @pytest.mark.asyncio
    async def test_async_init_pydantic_validation(self, transform, mock_vault):
        """Test that async_init validates params with Pydantic."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Should not raise validation error
        await transform.async_init()

        # Params should be validated and stored
        assert isinstance(transform.params, dict)
        assert "TEST_API_KEY" in transform.params


class TestTransformExecuteWithVault:
    """Tests for execute() method with vault integration."""

    @pytest.mark.asyncio
    async def test_execute_resolves_vault_secrets(self, transform, mock_vault):
        """Test that execute resolves vault secrets before scan."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Execute the transform
        result = await transform.execute(["test"])

        # Vault secret should be resolved
        assert mock_vault.get_secret.called
        assert "TEST_API_KEY" in transform.params
        assert transform.params["TEST_API_KEY"] == secret_value

    @pytest.mark.asyncio
    async def test_execute_uses_resolved_secrets_in_scan(self, transform, mock_vault):
        """Test that scan can access resolved secrets."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        # Create a transform that uses get_secret in scan
        class SecretUsingTransform(MockTransform):
            async def scan(self, data: List[str]) -> List[str]:
                api_key = self.get_secret("TEST_API_KEY")
                return [f"{item}_{api_key}" for item in data]

        transform = SecretUsingTransform(
            sketch_id=str(uuid.uuid4()),
            scan_id="scan_123",
            vault=mock_vault,
            params={},
        )

        # Execute
        result = await transform.execute(["test"])

        # Result should contain the secret value
        assert result == [f"test_{secret_value}"]
