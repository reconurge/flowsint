from flowsint_types import (
    Domain, Ip, Individual, Email, Phone, Organization,
    Username, Credential, CryptoWallet, CryptoNFT,
    CryptoWalletTransaction, SocialAccount, Website,
    Port, CIDR, ASN, Location
)


def test_ip_label():
    ip = Ip(address="12.23.34.56")
    assert ip.label == "12.23.34.56"


def test_domain_label():
    domain = Domain(domain="blog.mydomain.com")
    assert domain.label == "blog.mydomain.com"


def test_individual_label():
    individual = Individual(first_name="John", last_name="Doe")
    assert individual.label == "John Doe"


def test_email_label():
    email = Email(email="john.doe@example.com")
    assert email.label == "john.doe@example.com"


def test_phone_label():
    phone = Phone(number="+33123456789")
    assert phone.label == "+33123456789"


def test_organization_label():
    # Test with name only
    org = Organization(name="Acme Corp")
    assert org.label == "Acme Corp"


def test_organization_label_with_nom_complet():
    # Test with nom_complet (has priority)
    org = Organization(name="Acme", nom_complet="Acme Corporation Full Name")
    assert org.label == "Acme Corporation Full Name"


def test_organization_label_with_nom_raison_sociale():
    # Test with nom_raison_sociale (priority over name)
    org = Organization(name="Acme", nom_raison_sociale="Acme Corporation")
    assert org.label == "Acme Corporation"


def test_username_label():
    username = Username(value="johndoe")
    assert username.label == "johndoe"


def test_credential_label():
    # Test with service
    credential = Credential(username="john", service="github")
    assert credential.label == "john@github"


def test_credential_label_without_service():
    # Test without service
    credential = Credential(username="john")
    assert credential.label == "john"


def test_crypto_wallet_label():
    wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    assert wallet.label == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"


def test_crypto_nft_label_with_name():
    wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    nft = CryptoNFT(
        wallet=wallet,
        contract_address="0x123d35Cc6634C0532925a3b844Bc454e4438f123",
        token_id="1234",
        name="Cool NFT"
    )
    assert nft.label == "Cool NFT"


def test_crypto_nft_label_with_collection():
    wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    nft = CryptoNFT(
        wallet=wallet,
        contract_address="0x123d35Cc6634C0532925a3b844Bc454e4438f123",
        token_id="1234",
        collection_name="Bored Apes"
    )
    assert nft.label == "Bored Apes #1234"


def test_crypto_nft_label_fallback_uid():
    wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    nft = CryptoNFT(
        wallet=wallet,
        contract_address="0x123d35Cc6634C0532925a3b844Bc454e4438f123",
        token_id="1234"
    )
    assert nft.label == "0x123d35Cc6634C0532925a3b844Bc454e4438f123:1234"


def test_crypto_wallet_transaction_label_with_hash():
    source_wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    transaction = CryptoWalletTransaction(
        source=source_wallet,
        hash="0xabc123def456"
    )
    assert transaction.label == "0xabc123def456"


def test_crypto_wallet_transaction_label_with_source_and_target():
    source_wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    target_wallet = CryptoWallet(address="0x123d35Cc6634C0532925a3b844Bc454e4438f123")
    transaction = CryptoWalletTransaction(
        source=source_wallet,
        target=target_wallet
    )
    assert transaction.label == "Transaction from 0x742d35... to 0x123d35..."


def test_crypto_wallet_transaction_label_source_only():
    source_wallet = CryptoWallet(address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    transaction = CryptoWalletTransaction(source=source_wallet)
    assert transaction.label == "Transaction from 0x742d35..."


def test_social_account_label_with_display_name():
    username = Username(value="johndoe")
    account = SocialAccount(
        username=username,
        display_name="John Doe",
        platform="twitter"
    )
    assert account.label == "John Doe (@johndoe)"


def test_social_account_label_without_display_name():
    username = Username(value="johndoe")
    account = SocialAccount(
        username=username,
        platform="twitter"
    )
    assert account.label == "@johndoe"


def test_website_label():
    website = Website(url="https://www.example.com")
    assert website.label == "https://www.example.com/"


def test_port_label():
    # Test with service and protocol
    port = Port(number=80, service="http", protocol="TCP")
    assert port.label == "80 http (TCP)"


def test_port_label_with_service_only():
    # Test with service only
    port = Port(number=443, service="https")
    assert port.label == "443 https"


def test_port_label_number_only():
    # Test with number only
    port = Port(number=8080)
    assert port.label == "8080"


def test_cidr_label():
    cidr = CIDR(network="8.8.8.0/24")
    assert cidr.label == "8.8.8.0/24"


def test_asn_label_with_name():
    asn = ASN(asn_str="AS15169", name="Google LLC")
    assert asn.label == "AS15169 - Google LLC"


def test_asn_label_without_name():
    asn = ASN(asn_str="AS15169")
    assert asn.label == "AS15169"


def test_location_label():
    location = Location(
        address="123 Main St",
        city="Paris",
        country="France",
        zip="75001"
    )
    assert location.label == "123 Main St, Paris, France"
