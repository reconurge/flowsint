import pytest
from flowsint_transforms.crypto.wallet_to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_types.wallet import CryptoWallet, CryptoWalletTransaction

transform = CryptoWalletAddressToTransactions(
    "sketch_123",
    "scan_123",
    params={"ETHERSCAN_API_KEY": "ta-clef-api"},
)


def test_wallet_address_to_transactions_name():
    assert transform.name() == "wallet_to_transactions"


def test_wallet_address_to_transactions_category():
    assert transform.category() == "CryptoCryptoWallet"


def test_wallet_address_to_transactions_key():
    assert transform.key() == "address"


def test_preprocess_with_string():
    input_data = ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"]
    result = transform.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], CryptoWallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"


def test_preprocess_with_dict():
    input_data = [{"address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}]
    result = transform.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], CryptoWallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"


def test_preprocess_with_wallet_object():
    wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    input_data = [wallet]
    result = transform.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], CryptoWallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"


@pytest.mark.asyncio
async def test_scan_mocked_transactions(monkeypatch):
    # Mock the _get_transactions method - note it takes address and api_key parameters
    async def mock_get_transactions(address, api_key):
        return [
            CryptoWalletTransaction(
                hash="0x123",
                source=CryptoWallet(
                    address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                ),
                target=CryptoWallet(address="0x456"),
                value=1.0,  # 1 ETH
                timestamp="1234567890",
                block_number="12345",
                block_hash="0xabc",
                nonce="1",
                transaction_index="0",
                gas="21000",
                gas_price="20000000000",
                gas_used="21000",
                cumulative_gas_used="21000",
                input="0x",
                contract_address=None,
            )
        ]

    monkeypatch.setattr(transform, "_get_transactions", mock_get_transactions)

    input_data = [CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")]
    result = await transform.scan(input_data)

    assert len(result) == 1
    assert len(result[0]) == 1
    assert result[0][0].hash == "0x123"
    assert result[0][0].source.address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    assert result[0][0].target.address == "0x456"
    assert result[0][0].value == 1.0
    assert result[0][0].timestamp == "1234567890"


def test_transform_requires_api_key():
    """Test that the transform validates required ETHERSCAN_API_KEY parameter at construction"""
    with pytest.raises(
        ValueError, match="Transform wallet_to_transactions received invalid params"
    ):
        CryptoWalletAddressToTransactions("sketch_123", "scan_123", params={})


def test_transform_with_invalid_api_key_type():
    """Test that the transform validates parameter types"""
    with pytest.raises(
        ValueError, match="Transform wallet_to_transactions received invalid params"
    ):
        CryptoWalletAddressToTransactions(
            "sketch_123", "scan_123", params={"ETHERSCAN_API_KEY": 123}
        )
