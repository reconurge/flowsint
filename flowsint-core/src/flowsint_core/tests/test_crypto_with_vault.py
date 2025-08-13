import pytest
import uuid
from flowsint_transforms.crypto.wallet_to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_transforms.crypto.wallet_to_nfts import CryptoWalletAddressToNFTs
from ..core.vault import Vault
from .fixtures.database import (
    test_db_session,
    test_owner_id,
    test_profile,
    test_api_key,
    test_vault,
    test_vault_with_multiple_keys,
    multiple_test_keys,
    test_sketch_scan_ids,
)


class TestVaultIntegration:
    """Test suite for Vault integration"""

    def test_vault_creation(self, test_vault, test_owner_id):
        """Test vault creation with valid owner ID"""
        assert test_vault.owner_id == test_owner_id
        assert test_vault.db is not None

    def test_vault_creation_without_owner_id(self, test_db_session):
        """Test vault creation fails without owner ID"""
        with pytest.raises(ValueError, match="owner_id is required to use the vault"):
            Vault(db=test_db_session, owner_id=None)

    def test_vault_get_secret_by_name(self, test_vault_with_multiple_keys):
        """Test retrieving secret by key name"""
        secret = test_vault_with_multiple_keys.get_secret("vaultKey1")
        assert secret == "test_vault_key_789"

    def test_vault_get_secret_by_uuid(
        self, test_vault_with_multiple_keys, multiple_test_keys
    ):
        """Test retrieving secret by key UUID"""
        # Get the UUID of the first key
        key_uuid = str(multiple_test_keys[0].id)
        secret = test_vault_with_multiple_keys.get_secret(key_uuid)
        assert secret == "test_etherscan_key_123"

    def test_vault_get_secret_nonexistent(self, test_vault):
        """Test retrieving non-existent secret returns None"""
        secret = test_vault.get_secret("nonexistent_key")
        assert secret is None

    def test_vault_get_secret_wrong_owner(self, test_db_session, test_api_key):
        """Test retrieving secret with wrong owner ID returns None"""
        wrong_owner_id = uuid.uuid4()
        vault = Vault(db=test_db_session, owner_id=wrong_owner_id)
        secret = vault.get_secret("test_etherscan_key")
        assert secret is None


class TestCryptoWalletAddressToTransactions:
    """Test suite for CryptoWalletAddressToTransactions scanner with vault integration"""

    def test_scanner_creation_with_vault(self, test_vault, test_sketch_scan_ids):
        """Test scanner creation with vault"""
        scanner = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault,
            params={
                "ETHERSCAN_API_KEY": "test_etherscan_key",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        assert scanner.sketch_id == test_sketch_scan_ids["sketch_id"]
        assert scanner.scan_id == test_sketch_scan_ids["scan_id"]
        assert scanner.vault == test_vault

    def test_scanner_creation_without_vault(self, test_sketch_scan_ids):
        """Test scanner creation without vault"""
        scanner = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            params={
                "ETHERSCAN_API_KEY": "direct_api_key",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        assert scanner.vault is None

    @pytest.mark.asyncio
    async def test_async_init_with_vault_key_exists(
        self, test_vault_with_multiple_keys, test_sketch_scan_ids
    ):
        """Test async_init when vault key exists"""
        scanner = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "vaultKey1",  # This key exists in vault
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Get params before async_init
        params_before = scanner.get_params()
        assert params_before["ETHERSCAN_API_KEY"] == "vaultKey1"

        # Initialize scanner
        await scanner.async_init()

        # Get params after async_init - should be resolved from vault
        params_after = scanner.get_params()
        assert params_after["ETHERSCAN_API_KEY"] == "test_vault_key_789"

    @pytest.mark.asyncio
    async def test_async_init_with_vault_key_not_exists(
        self, test_vault, test_sketch_scan_ids
    ):
        """Test async_init when vault key doesn't exist"""
        scanner = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault,
            params={
                "ETHERSCAN_API_KEY": "nonexistent_key",  # This key doesn't exist
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Get params before async_init
        params_before = scanner.get_params()
        assert params_before["ETHERSCAN_API_KEY"] == "nonexistent_key"

        # Initialize scanner
        await scanner.async_init()

        # Get params after async_init - should remain unchanged since key not found
        params_after = scanner.get_params()
        assert params_after["ETHERSCAN_API_KEY"] == "nonexistent_key"

    @pytest.mark.asyncio
    async def test_async_init_without_vault(self, test_sketch_scan_ids):
        """Test async_init without vault"""
        scanner = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            params={
                "ETHERSCAN_API_KEY": "direct_api_key",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Get params before async_init
        params_before = scanner.get_params()
        assert params_before["ETHERSCAN_API_KEY"] == "direct_api_key"

        # Initialize scanner
        await scanner.async_init()

        # Get params after async_init - should remain unchanged
        params_after = scanner.get_params()
        assert params_after["ETHERSCAN_API_KEY"] == "direct_api_key"

    def test_scanner_properties(self, test_vault, test_sketch_scan_ids):
        """Test scanner static properties"""
        assert CryptoWalletAddressToTransactions.name() == "wallet_to_transactions"
        assert CryptoWalletAddressToTransactions.category() == "CryptoWallet"
        assert isinstance(CryptoWalletAddressToTransactions.required_params(), bool)


class TestCryptoWalletAddressToNFTs:
    """Test suite for CryptoWalletAddressToNFTs scanner with vault integration"""

    def test_scanner_creation_with_vault(self, test_vault, test_sketch_scan_ids):
        """Test scanner creation with vault"""
        scanner = CryptoWalletAddressToNFTs(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault,
            params={
                "ETHERSCAN_API_KEY": "test_etherscan_key",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        assert scanner.sketch_id == test_sketch_scan_ids["sketch_id"]
        assert scanner.scan_id == test_sketch_scan_ids["scan_id"]
        assert scanner.vault == test_vault

    @pytest.mark.asyncio
    async def test_async_init_with_vault_multiple_keys(
        self, test_vault_with_multiple_keys, test_sketch_scan_ids
    ):
        """Test async_init with multiple vault keys"""
        scanner = CryptoWalletAddressToNFTs(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "etherscan_api_key",  # This key exists in vault
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Initialize scanner
        await scanner.async_init()

        # Get params after async_init - should be resolved from vault
        params_after = scanner.get_params()
        assert params_after["ETHERSCAN_API_KEY"] == "test_etherscan_key_123"

    def test_scanner_properties(self):
        """Test scanner static properties"""
        assert CryptoWalletAddressToNFTs.name() == "wallet_to_nfts"
        assert CryptoWalletAddressToNFTs.category() == "CryptoWallet"
        assert isinstance(CryptoWalletAddressToNFTs.required_params(), bool)


class TestBothCryptoScannersIntegration:
    """Test suite for testing both crypto scanners together"""

    @pytest.mark.asyncio
    async def test_multiple_scanners_same_vault(
        self, test_vault_with_multiple_keys, test_sketch_scan_ids
    ):
        """Test multiple scanners using the same vault"""
        scanner1 = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "vaultKey1",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        scanner2 = CryptoWalletAddressToNFTs(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "vaultKey1",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Initialize both scanners
        await scanner1.async_init()
        await scanner2.async_init()

        # Both should have resolved the same key
        params1 = scanner1.get_params()
        params2 = scanner2.get_params()

        assert params1["ETHERSCAN_API_KEY"] == "test_vault_key_789"
        assert params2["ETHERSCAN_API_KEY"] == "test_vault_key_789"

    @pytest.mark.asyncio
    async def test_multiple_scanners_different_keys(
        self, test_vault_with_multiple_keys, test_sketch_scan_ids
    ):
        """Test multiple scanners using different vault keys"""
        scanner1 = CryptoWalletAddressToTransactions(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "vaultKey1",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        scanner2 = CryptoWalletAddressToNFTs(
            sketch_id=test_sketch_scan_ids["sketch_id"],
            scan_id=test_sketch_scan_ids["scan_id"],
            vault=test_vault_with_multiple_keys,
            params={
                "ETHERSCAN_API_KEY": "etherscan_api_key",
                "ETHERSCAN_API_URL": "https://api.etherscan.io/api",
            },
        )

        # Initialize both scanners
        await scanner1.async_init()
        await scanner2.async_init()

        # Should have resolved different keys
        params1 = scanner1.get_params()
        params2 = scanner2.get_params()

        assert params1["ETHERSCAN_API_KEY"] == "test_vault_key_789"
        assert params2["ETHERSCAN_API_KEY"] == "test_etherscan_key_123"

    def test_scanner_schemas_consistency(self):
        """Test that both crypto scanners have consistent schemas"""
        transactions_schema = CryptoWalletAddressToTransactions.input_schema()
        nfts_schema = CryptoWalletAddressToNFTs.input_schema()

        # Both should accept the same input type (crypto wallet)
        assert transactions_schema["type"] == nfts_schema["type"]

        # Both should have param schemas with ETHERSCAN_API_KEY
        transactions_params = CryptoWalletAddressToTransactions.get_params_schema()
        nfts_params = CryptoWalletAddressToNFTs.get_params_schema()

        # Check that both have ETHERSCAN_API_KEY parameter
        transactions_api_key = next(
            (
                param
                for param in transactions_params
                if param["name"] == "ETHERSCAN_API_KEY"
            ),
            None,
        )
        nfts_api_key = next(
            (param for param in nfts_params if param["name"] == "ETHERSCAN_API_KEY"),
            None,
        )

        assert transactions_api_key is not None
        assert nfts_api_key is not None
        assert transactions_api_key["required"] == nfts_api_key["required"]
