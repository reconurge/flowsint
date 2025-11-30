"""Integration tests for enrichers using vault secrets."""
import pytest
import uuid
from unittest.mock import Mock
from flowsint_enrichers.domain.to_history import DomainToHistoryEnricher
from flowsint_enrichers.individual.to_domains import IndividualToDomainsEnricher
from flowsint_enrichers.email.to_domains import EmailToDomainsEnricher
from flowsint_enrichers.crypto.to_nfts import CryptoWalletAddressToNFTs
from flowsint_enrichers.crypto.to_transactions import CryptoWalletAddressToTransactions
from flowsint_enrichers.email.to_leaks import EmailToBreachesEnricher


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


class TestWhoxyEnrichersVaultIntegration:
    """Tests for WHOXY enrichers vault integration."""

    @pytest.mark.asyncio
    async def test_domain_to_history_gets_api_key_from_vault(
        self, mock_vault, sketch_id
    ):
        """Test that domain_to_history retrieves WHOXY_API_KEY from vault."""
        api_key = "whoxy-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = DomainToHistoryEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "WHOXY_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("WHOXY_API_KEY") == api_key

    @pytest.mark.asyncio
    async def test_individual_to_domains_gets_api_key_from_vault(
        self, mock_vault, sketch_id
    ):
        """Test that individual_to_domains retrieves WHOXY_API_KEY from vault."""
        api_key = "whoxy-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = IndividualToDomainsEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "WHOXY_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("WHOXY_API_KEY") == api_key

    @pytest.mark.asyncio
    async def test_email_to_domains_gets_api_key_from_vault(
        self, mock_vault, sketch_id
    ):
        """Test that email_to_domains retrieves WHOXY_API_KEY from vault."""
        api_key = "whoxy-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = EmailToDomainsEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "WHOXY_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("WHOXY_API_KEY") == api_key


class TestEtherscanEnrichersVaultIntegration:
    """Tests for Etherscan enrichers vault integration."""

    @pytest.mark.asyncio
    async def test_wallet_to_nfts_gets_api_key_from_vault(self, mock_vault, sketch_id):
        """Test that wallet_to_nfts retrieves ETHERSCAN_API_KEY from vault."""
        api_key = "etherscan-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = CryptoWalletAddressToNFTs(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "ETHERSCAN_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("ETHERSCAN_API_KEY") == api_key

    @pytest.mark.asyncio
    async def test_wallet_to_transactions_gets_api_key_from_vault(
        self, mock_vault, sketch_id
    ):
        """Test that wallet_to_transactions retrieves ETHERSCAN_API_KEY from vault."""
        api_key = "etherscan-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = CryptoWalletAddressToTransactions(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "ETHERSCAN_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("ETHERSCAN_API_KEY") == api_key


class TestHIBPEnrichersVaultIntegration:
    """Tests for HIBP enrichers vault integration."""

    @pytest.mark.asyncio
    async def test_email_to_breaches_gets_api_key_from_vault(
        self, mock_vault, sketch_id
    ):
        """Test that email_to_breaches retrieves HIBP_API_KEY from vault."""
        api_key = "hibp-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = EmailToBreachesEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        await enricher.async_init()

        # Verify vault was queried for the API key
        mock_vault.get_secret.assert_called()
        calls = [call[0][0] for call in mock_vault.get_secret.call_args_list]
        assert "HIBP_API_KEY" in calls

        # Verify the key is accessible via get_secret
        assert enricher.get_secret("HIBP_API_KEY") == api_key


class TestVaultSecretWithUserProvidedID:
    """Tests for vault secrets when user provides a specific vault ID."""

    @pytest.mark.asyncio
    async def test_enricher_uses_user_provided_vault_id(self, mock_vault, sketch_id):
        """Test that enricher uses user-provided vault ID if specified."""
        vault_id = str(uuid.uuid4())
        api_key = "whoxy-api-key-12345"

        # First call (by ID) returns the secret
        mock_vault.get_secret.return_value = api_key

        enricher = DomainToHistoryEnricher(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={"WHOXY_API_KEY": vault_id},  # User selected a specific vault entry
        )

        await enricher.async_init()

        # Verify vault was queried with the provided ID first
        first_call = mock_vault.get_secret.call_args_list[0][0][0]
        assert first_call == vault_id

        # Verify the key is accessible
        assert enricher.get_secret("WHOXY_API_KEY") == api_key

    @pytest.mark.asyncio
    async def test_enricher_fallback_to_name_if_id_not_found(
        self, mock_vault, sketch_id
    ):
        """Test that enricher falls back to name lookup if vault ID not found."""
        vault_id = str(uuid.uuid4())
        api_key = "whoxy-api-key-12345"

        # First call (by ID) returns None, second call (by name) returns the secret
        mock_vault.get_secret.side_effect = [None, api_key]

        enricher = DomainToHistoryEnricher(
            sketch_id=sketch_id,
            scan_id="scan_123",
            vault=mock_vault,
            params={"WHOXY_API_KEY": vault_id},
        )

        await enricher.async_init()

        # Verify vault was queried twice: first by ID, then by name
        assert mock_vault.get_secret.call_count == 2
        assert mock_vault.get_secret.call_args_list[0][0][0] == vault_id
        assert mock_vault.get_secret.call_args_list[1][0][0] == "WHOXY_API_KEY"

        # Verify the key is accessible
        assert enricher.get_secret("WHOXY_API_KEY") == api_key


class TestMissingRequiredVaultSecret:
    """Tests for error handling when required vault secrets are missing."""

    @pytest.mark.asyncio
    async def test_missing_required_secret_raises_exception(self, mock_vault, sketch_id):
        """Test that missing required secret raises an exception."""
        # Vault returns None (secret not found)
        mock_vault.get_secret.return_value = None

        enricher = DomainToHistoryEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        # async_init should raise an exception when required secret is missing
        with pytest.raises(Exception) as exc_info:
            await enricher.async_init()

        # Verify the exception message contains the secret name
        assert "WHOXY_API_KEY" in str(exc_info.value)
        assert "missing" in str(exc_info.value).lower()
        assert "Vault settings" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_enricher_with_provided_secret_succeeds(self, mock_vault, sketch_id):
        """Test that enricher succeeds when required secret is provided."""
        # Vault returns the secret
        api_key = "whoxy-api-key-12345"
        mock_vault.get_secret.return_value = api_key

        enricher = DomainToHistoryEnricher(
            sketch_id=sketch_id, scan_id="scan_123", vault=mock_vault, params={}
        )

        # async_init should succeed
        await enricher.async_init()

        # Secret should be accessible
        assert enricher.get_secret("WHOXY_API_KEY") == api_key
