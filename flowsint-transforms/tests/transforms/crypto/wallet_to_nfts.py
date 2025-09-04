from flowsint_transforms.crypto.wallet_to_nfts import CryptoWalletAddressToNFTs
from flowsint_types.wallet import CryptoWallet, CryptoNFT
from pydantic import HttpUrl

transform = CryptoWalletAddressToNFTs("sketch_123", "scan_123")


def test_wallet_address_to_transactions_name():
    assert transform.name() == "wallet_to_nfts"


def test_wallet_address_to_transactions_category():
    assert transform.category() == "crypto"


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


def test_scan_mocked_transactions(monkeypatch):
    # Mock the _get_transactions method
    def mock_get_nfts(address):
        return [
            CryptoNFT(
                wallet=CryptoWallet(
                    address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                ),
                contract_address="0x123",
                token_id="1",
                collection_name="Test Collection",
                metadata_url="https://example.com/metadata.json",
                image_url="https://example.com/image.png",
                name="Test NFT",
            )
        ]

    monkeypatch.setattr(transform, "_get_nfts", mock_get_nfts)

    input_data = [CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")]
    result = transform.scan(input_data)

    assert len(result) == 1
    assert len(result[0]) == 1
    assert result[0][0].contract_address == "0x123"
    assert result[0][0].collection_name == "Test Collection"
    assert result[0][0].metadata_url == HttpUrl("https://example.com/metadata.json")
    assert result[0][0].image_url == HttpUrl("https://example.com/image.png")
    assert result[0][0].name == "Test NFT"
