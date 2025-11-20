"""Tests for Transform base class vault integration."""
import pytest
import uuid
from typing import List, Dict, Any
from unittest.mock import Mock, MagicMock, patch
from flowsint_core.core.transform_base import Transform


class MockTransform(Transform):
    """Mock transform for testing."""

    InputType = str
    OutputType = str

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

    async def scan(self, data: List[InputType]) -> List[OutputType]:
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
        params_schema=MockTransform.get_params_schema(),
    )


class TestResolveParams:
    """Tests for resolve_params() method."""

    @pytest.mark.asyncio
    async def test_resolve_vault_secret_by_name(self, transform, mock_vault):
        """Test resolving a vault secret by parameter name."""
        secret_value = "my-api-key-12345"
        mock_vault.get_secret.return_value = secret_value

        await transform.async_init()

        # Should try to get by name "TEST_API_KEY"
        assert mock_vault.get_secret.called
        assert "TEST_API_KEY" in transform.params
        assert transform.params["TEST_API_KEY"] == secret_value

    @pytest.mark.asyncio
    async def test_resolve_vault_secret_by_id(self, sketch_id, mock_vault):
        """Test resolving a vault secret by vault ID."""
        secret_value = "my-api-key-12345"
        vault_id = str(uuid.uuid4())

        # Mock vault to return secret for ID, and optional key default
        def get_secret_side_effect(key):
            if key == vault_id:
                return secret_value
            elif key == "OPTIONAL_KEY":
                return None  # Will use default
            return None

        mock_vault.get_secret.side_effect = get_secret_side_effect

        # Create transform with vault ID in params
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={"TEST_API_KEY": vault_id},
            params_schema=MockTransform.get_params_schema(),
        )

        await transform.async_init()

        # Should have called get_secret with the vault ID
        assert any(call[0][0] == vault_id for call in mock_vault.get_secret.call_args_list)
        assert "TEST_API_KEY" in transform.params
        assert transform.params["TEST_API_KEY"] == secret_value

    @pytest.mark.asyncio
    async def test_resolve_vault_secret_fallback_to_name(self, sketch_id, mock_vault):
        """Test that if vault ID fails, it falls back to name lookup."""
        secret_value = "my-api-key-12345"
        vault_id = str(uuid.uuid4())

        # Mock vault: ID returns None, name returns secret, optional returns None
        def get_secret_side_effect(key):
            if key == vault_id:
                return None  # Vault ID not found
            elif key == "TEST_API_KEY":
                return secret_value  # Fallback to name works
            elif key == "OPTIONAL_KEY":
                return None  # Will use default
            return None

        mock_vault.get_secret.side_effect = get_secret_side_effect

        # Create transform with vault ID in params
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={"TEST_API_KEY": vault_id},
            params_schema=MockTransform.get_params_schema(),
        )

        await transform.async_init()

        # Should have called get_secret with both vault ID and TEST_API_KEY name
        call_args = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert vault_id in call_args
        assert "TEST_API_KEY" in call_args
        assert "TEST_API_KEY" in transform.params
        assert transform.params["TEST_API_KEY"] == secret_value

    def test_resolve_vault_secret_not_found_required(self, transform, mock_vault):
        """Test that missing required vault secret raises exception."""
        mock_vault.get_secret.return_value = None

        # Should raise an exception for missing required secret
        with pytest.raises(Exception) as exc_info:
            transform.resolve_params()

        assert "TEST_API_KEY" in str(exc_info.value)
        assert "missing" in str(exc_info.value).lower()
        assert "Vault settings" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_resolve_vault_secret_optional_with_default(self, transform, mock_vault):
        """Test that optional vault secret uses default if not found."""
        # Only return secret for TEST_API_KEY, not OPTIONAL_KEY
        mock_vault.get_secret.side_effect = lambda key: (
            "test-api-key" if key == "TEST_API_KEY" else None
        )

        await transform.async_init()

        # Optional key should use default value
        assert "OPTIONAL_KEY" in transform.params
        assert transform.params["OPTIONAL_KEY"] == "default_value"

    @pytest.mark.asyncio
    async def test_resolve_non_vault_param_from_params(self, mock_vault, sketch_id):
        """Test that non-vault params are taken from params."""
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={"NON_VAULT_PARAM": "custom_value"},
            params_schema=MockTransform.get_params_schema(),
        )
        mock_vault.get_secret.return_value = "test-api-key"

        await transform.async_init()

        assert "NON_VAULT_PARAM" in transform.params
        assert transform.params["NON_VAULT_PARAM"] == "custom_value"

    @pytest.mark.asyncio
    async def test_resolve_non_vault_param_uses_default(self, transform, mock_vault):
        """Test that non-vault params use default if not provided."""
        mock_vault.get_secret.return_value = "test-api-key"

        await transform.async_init()

        assert "NON_VAULT_PARAM" in transform.params
        assert transform.params["NON_VAULT_PARAM"] == "test"

    def test_resolve_params_no_vault_instance(self, sketch_id):
        """Test that resolve_params works without vault (uses defaults for optional params)."""
        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=None,  # No vault
            params={},
            params_schema=MockTransform.get_params_schema(),
        )

        # Without vault, required secrets won't be resolved, optional ones will use defaults
        resolved = transform.resolve_params()

        # Optional params should use defaults
        assert "OPTIONAL_KEY" in resolved
        assert resolved["OPTIONAL_KEY"] == "default_value"
        assert "NON_VAULT_PARAM" in resolved
        assert resolved["NON_VAULT_PARAM"] == "test"

        # Required vault secrets won't be in resolved (no exception when vault is None)
        assert "TEST_API_KEY" not in resolved


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
    async def test_get_secret_not_found_uses_default(self, mock_vault, sketch_id):
        """Test get_secret returns default when secret not found."""
        mock_vault.get_secret.return_value = "test-api-key"

        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={},
            params_schema=MockTransform.get_params_schema(),
        )

        # Run async_init to resolve params
        await transform.async_init()

        # Get the secret with default (NONEXISTENT_KEY doesn't exist in params)
        result = transform.get_secret("NONEXISTENT_KEY", "default")

        assert result == "default"

    @pytest.mark.asyncio
    async def test_get_secret_returns_default_when_value_is_none(
        self, mock_vault, sketch_id
    ):
        """Test get_secret returns default when value is None."""
        mock_vault.get_secret.return_value = "test-api-key"

        transform = MockTransform(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={},
            params_schema=MockTransform.get_params_schema(),
        )

        # Run async_init to resolve params
        await transform.async_init()

        # Get a non-existent secret without default
        result = transform.get_secret("NONEXISTENT_KEY")

        assert result is None

        # Get a non-existent secret with default
        result = transform.get_secret("NONEXISTENT_KEY", "fallback")

        assert result == "fallback"


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
            params_schema=MockTransform.get_params_schema(),
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
    async def test_execute_uses_resolved_secrets_in_scan(self, mock_vault):
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
            params_schema=MockTransform.get_params_schema(),
        )

        # Execute
        result = await transform.execute(["test"])

        # Result should contain the secret value
        assert result == [f"test_{secret_value}"]
