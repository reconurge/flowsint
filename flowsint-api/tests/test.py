import sys
import os
import asyncio
import uuid
import random

# Add the parent directory to Python path so we can import from app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.scanners.crypto.wallet_to_transactions import CryptoWalletAddressToTransactions
from app.scanners.crypto.wallet_to_nfts import CryptoWalletAddressToNFTs
from app.core.vault import Vault
from app.core.postgre_db import SessionLocal
from app.models.models import Key, Profile

def setup_test_data(db_session, owner_id: uuid.UUID):
    """Set up test data including user and API keys"""
    
    # Generate a unique email for testing
    unique_email = f"test_{random.randint(1000, 9999)}@example.com"
    
    # First, create a test user/profile
    test_user = Profile(
        id=owner_id,
        email=unique_email,
        hashed_password="test_hashed_password",
        is_active=True
    )
    
    db_session.add(test_user)
    db_session.commit()  # Commit the user first
    
    # Now create a test API key for ETHERSCAN_API_KEY
    test_key = Key(
        id=uuid.uuid4(),
        name="vaultKey1",  # This matches the vaultRef in scanner params
        owner_id=owner_id,
        encrypted_key="test_etherscan_api_key_12345"  # Mock API key
    )
    
    db_session.add(test_key)
    db_session.commit()
    
    print(f"Created test user with email: {test_user.email}")
    print(f"Created test API key with name: {test_key.name}")
    return test_key

async def main():
    # Create database session using the existing get_db pattern
    db_session = SessionLocal()
    
    try:
        # Create a test owner ID (in real app this would be from authentication)
        owner_id = uuid.uuid4()
        
        # Set up test data
        test_key = setup_test_data(db_session, owner_id)
        
        # Create vault instance
        vault = Vault(db=db_session, owner_id=owner_id)
        
        # Create scanners with vault
        scanner = CryptoWalletAddressToTransactions(
            sketch_id="sketch_123",
            scan_id="scan_123",
            vault=vault,  # Pass the vault
            params={"ETHERSCAN_API_KEY": "vaultKey1doesntexist",
                    "ETHERSCAN_API_URL":  "https://api.etherscan.io/api"}
        )
        
        scanner2 = CryptoWalletAddressToNFTs(
            sketch_id="sketch_123",
            scan_id="scan_123",
            vault=vault,  # Pass the vault
            params={"ETHERSCAN_API_KEY": "vaultKey1doesntexist", 
                    "ETHERSCAN_API_URL": "https://api.etherscan.io/api"}
        )
        
        print("Scanner 1 params (before async_init):", scanner.get_params())
        print("Scanner 2 params (before async_init):", scanner2.get_params())
        
        # Initialize scanners asynchronously
        await scanner.async_init()
        await scanner2.async_init()

        print("Scanner 1 params (after async_init):", scanner.get_params())
        print("Scanner 2 params (after async_init):", scanner2.get_params())
        
        # Test vault directly
        secret = vault.get_secret("vaultKey1")
        print(f"Retrieved secret from vault: {secret}")
        
        # Test vault with non-existent key
        secret_none = vault.get_secret("nonexistent")
        print(f"Retrieved secret for non-existent key: {secret_none}")
        
    finally:
        db_session.close()
        
if __name__ == "__main__":
    asyncio.run(main())
