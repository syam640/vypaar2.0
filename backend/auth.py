from fastapi import HTTPException, Header
import os
import base64
import json
import hmac
import hashlib
import time

# Required for the new Supabase ES256 algorithm
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL        = os.getenv("SUPABASE_URL", "").rstrip("/")

# Simple in-process JWKS cache (keyed by kid)
_jwks_cache: dict = {}

def _b64decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)

def _verify_hs256(parts: list, secret: str) -> None:
    signing_input = f"{parts[0]}.{parts[1]}".encode()
    expected_sig  = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    ).rstrip(b"=")
    actual_sig = parts[2].rstrip("=").encode()
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")

def _verify_rs256(parts: list, kid: str) -> None:
    global _jwks_cache
    try:
        import httpx
        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
        from cryptography.hazmat.primitives.asymmetric import padding as asym_padding

        if kid not in _jwks_cache:
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            resp     = httpx.get(jwks_url, timeout=5)
            resp.raise_for_status()
            for key in resp.json().get("keys", []):
                _jwks_cache[key["kid"]] = key

        jwk = _jwks_cache.get(kid)
        if not jwk:
            raise HTTPException(status_code=401, detail="Unknown signing key kid")

        def _big_int(s):
            return int.from_bytes(_b64decode(s), "big")

        pub_key = RSAPublicNumbers(
            _big_int(jwk["e"]), _big_int(jwk["n"])
        ).public_key(default_backend())

        signing_input = f"{parts[0]}.{parts[1]}".encode()
        signature     = _b64decode(parts[2])
        pub_key.verify(signature, signing_input, asym_padding.PKCS1v15(), hashes.SHA256())

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"RS256 verification failed: {e}")

def _verify_es256(parts: list, kid: str) -> None:
    """Supports the new Supabase Elliptic Curve algorithm."""
    global _jwks_cache
    try:
        import httpx
        if kid not in _jwks_cache:
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            resp = httpx.get(jwks_url, timeout=5)
            resp.raise_for_status()
            for key in resp.json().get("keys", []):
                _jwks_cache[key["kid"]] = key

        jwk = _jwks_cache.get(kid)
        if not jwk:
            raise HTTPException(status_code=401, detail="Unknown signing key kid (ES256)")

        # Convert JWK x,y coordinates to an Elliptic Curve Public Key
        public_key = ec.EllipticCurvePublicNumbers(
            int.from_bytes(_b64decode(jwk["x"]), "big"),
            int.from_bytes(_b64decode(jwk["y"]), "big"),
            ec.SECP256R1()
        ).public_key(default_backend())

        signing_input = f"{parts[0]}.{parts[1]}".encode()
        signature = _b64decode(parts[2])
        
        # Verify the signature using ECDSA
        public_key.verify(signature, signing_input, ec.ECDSA(hashes.SHA256()))

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"ES256 verification failed: {e}")

def verify_token(authorization: str = Header(...)) -> str:
    """
    Verifies Supabase JWT — supports HS256, RS256, and the new ES256.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    parts = token.split(".")

    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Malformed JWT")

    try:
        header  = json.loads(_b64decode(parts[0]))
        payload = json.loads(_b64decode(parts[1]))
    except Exception:
        raise HTTPException(status_code=401, detail="Could not decode JWT")

    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    alg = header.get("alg", "HS256")
    kid = header.get("kid", "")

    if alg == "HS256":
        _verify_hs256(parts, SUPABASE_JWT_SECRET)
    elif alg == "RS256":
        _verify_rs256(parts, kid)
    elif alg == "ES256":
        _verify_es256(parts, kid)
    else:
        raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")

    return user_id