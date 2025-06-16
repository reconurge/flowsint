from app.scanners.crypto.wallet_to_transactions import WalletAddressToTransactions
from app.types.wallet import Wallet, WalletTransaction

scanner = WalletAddressToTransactions("sketch_123", "scan_123")

def test_wallet_address_to_transactions_name():
    assert scanner.name() == "wallet_to_transactions"

def test_wallet_address_to_transactions_category():
    assert scanner.category() == "crypto"

def test_wallet_address_to_transactions_key():
    assert scanner.key() == "address"

def test_preprocess_with_string():
    input_data = ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"]
    result = scanner.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], Wallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

def test_preprocess_with_dict():
    input_data = [{"address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}]
    result = scanner.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], Wallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

def test_preprocess_with_wallet_object():
    wallet = Wallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    input_data = [wallet]
    result = scanner.preprocess(input_data)
    assert len(result) == 1
    assert isinstance(result[0], Wallet)
    assert result[0].address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

def test_scan_mocked_transactions(monkeypatch):
    # Mock the _get_transactions method
    def mock_get_transactions(address):
        return [
            WalletTransaction(
                hash="0x123",
                from_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                to_address="0x456",
                value=1000000000000000000,  # 1 ETH in wei
                timestamp=1234567890
            )
        ]
    
    monkeypatch.setattr(scanner, "_get_transactions", mock_get_transactions)
    
    input_data = [Wallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")]
    result = scanner.scan(input_data)
    
    assert len(result) == 1
    assert len(result[0]) == 1
    assert result[0][0].hash == "0x123"
    assert result[0][0].from_address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    assert result[0][0].to_address == "0x456"
    assert result[0][0].value == 1000000000000000000
    assert result[0][0].timestamp == 1234567890
    