import os
import requests
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv
import json
from functools import lru_cache

load_dotenv()

# Chargement des variables d'environnement
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/jwks"  # URL correcte pour les JWKs
SUPABASE_ISSUER = f"{SUPABASE_URL}/auth/v1"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

http_bearer = HTTPBearer(auto_error=True)

@lru_cache(maxsize=1)
def get_jwks() -> Dict[str, Any]:
    """Récupère les clés JWKS depuis Supabase avec mise en cache."""
    try:
        headers = {"apikey": SUPABASE_KEY} if SUPABASE_KEY else {}
        response = requests.get(SUPABASE_JWKS_URL, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        # En production, évitez de révéler trop de détails sur l'erreur
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch JWKS"
        )

def get_key_from_jwks(token: str) -> Optional[Dict[str, Any]]:
    """Récupère la clé appropriée depuis JWKS en fonction du kid dans le header du JWT."""
    try:
        # Récupérer le header sans vérifier la signature
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        if not kid:
            return None
            
        # Récupérer les clés JWKS
        jwks = get_jwks()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
                
        return None
    except Exception:
        return None

def verify_token(token: str) -> Dict[str, Any]:
    """
    Vérifie un token JWT de Supabase.
    Essaie d'abord la validation avec JWK (RS256) puis avec secret partagé (HS256).
    """
    # Vérification des entrées
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    try:
        # Première tentative: vérification avec JWKS (RS256)
        try:
            jwk = get_key_from_jwks(token)
            if jwk:
                # Si une clé JWK est trouvée, nous utilisons RSA
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                decoded = jwt.decode(
                    token,
                    key=public_key,
                    algorithms=["RS256"],
                    audience="authenticated",
                    issuer=SUPABASE_ISSUER,
                )
                return decoded
        except (jwt.JWTError, AttributeError):
            # Échec avec RS256, on essaie avec HS256
            pass
            
        if SUPABASE_JWT_SECRET:
            decoded = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=SUPABASE_ISSUER,
            )
            return decoded
            
        # Si on arrive ici, aucune méthode n'a fonctionné
        raise JWTError("Token validation failed")
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid claims (audience or issuer)"
        )
    except (jwt.JWTError, JWTError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except Exception as e:
        # Fallback général
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer)
) -> Dict[str, Any]:
    """
    Dependencies to get the current user from the JWT token.
    Usage: user = Depends(get_current_user)
    """
    token = credentials.credentials
    return verify_token(token)

# Fonction utilitaire pour extraire les informations utilisateur du token JWT
def get_user_info(token_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts user infos from the JWT token data."""
    user_info = {
        "user_id": token_data.get("sub"),
        "email": token_data.get("email"),
        "role": token_data.get("role", ""),
        "app_metadata": token_data.get("app_metadata", {}),
        "user_metadata": token_data.get("user_metadata", {})
    }
    return user_info