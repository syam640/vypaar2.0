from fastapi import HTTPException, Header
import os, base64, json, hmac, hashlib, time

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "6ukbQnl2ZM1yVuMThwjKftaOOY5IlSv5g9ny+e00XMtq40By923wqcZ6eJ031MxdWeqVP+49YFa5d4x+6wANng==")
SUPABASE_URL        = os.getenv("SUPABASE_URL", "https://sjpufhaerzutzogyyjwz.supabase.co").rstrip("/")

_jwks_cache: dict = {}


def _b64decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _fetch_jwks():
    """Fetch and cache JWKS from Supabase."""
    import httpx
    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(jwks_url, timeout=5)
    resp.raise_for_status()
    for key in resp.json().get("keys", []):
        _jwks_cache[key["kid"]] = key


def _verify_hs256(parts: list, secret: str) -> None:
    signing_input = f"{parts[0]}.{parts[1]}".encode()
    expected_sig  = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    ).rstrip(b"=")
    if not hmac.compare_digest(expected_sig, parts[2].rstrip("=").encode()):
        raise HTTPException(status_code=401, detail="Invalid HS256 signature")


def _verify_asymmetric(parts: list, kid: str, alg: str) -> None:
    """Handles RS256 and ES256 via cryptography library + Supabase JWKS."""
    try:
        import httpx
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding as asym_padding, ec
        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
        from cryptography.hazmat.primitives.asymmetric.ec import (
            EllipticCurvePublicNumbers, SECP256K1, SECP256R1
        )

        # Fetch JWKS if kid not yet cached
        if kid not in _jwks_cache:
            _fetch_jwks()

        # If still not found, force-refresh once (key rotation)
        if kid not in _jwks_cache:
            _jwks_cache.clear()
            _fetch_jwks()

        jwk = _jwks_cache.get(kid)
        if not jwk:
            raise HTTPException(status_code=401, detail=f"Unknown key id: {kid}")

        signing_input = f"{parts[0]}.{parts[1]}".encode()
        signature     = _b64decode(parts[2])

        def _big_int(s):
            return int.from_bytes(_b64decode(s), "big")

        if alg == "RS256":
            pub_key = RSAPublicNumbers(
                _big_int(jwk["e"]), _big_int(jwk["n"])
            ).public_key(default_backend())
            pub_key.verify(signature, signing_input, asym_padding.PKCS1v15(), hashes.SHA256())

        elif alg == "ES256":
            # P-256 curve (prime256v1 / secp256r1)
            x = _big_int(jwk["x"])
            y = _big_int(jwk["y"])
            pub_numbers = EllipticCurvePublicNumbers(x, y, SECP256R1())
            pub_key = pub_numbers.public_key(default_backend())

            # ES256 signature is raw r||s (64 bytes), convert to DER for cryptography lib
            from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
            import struct
            if len(signature) == 64:
                # Raw r||s — convert to DER
                from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
                r = int.from_bytes(signature[:32], "big")
                s = int.from_bytes(signature[32:], "big")
                der_sig = encode_dss_signature(r, s)
            else:
                der_sig = signature

            pub_key.verify(der_sig, signing_input, ec.ECDSA(hashes.SHA256()))

        else:
            raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"{alg} verification failed: {e}")


def verify_token(authorization: str = Header(...)) -> str:
    """
    Verifies Supabase JWT.
    Supports HS256 (legacy), RS256, and ES256 (current Supabase default).
    Returns the user UUID (sub claim).
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

    # Check expiry
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired — please sign in again")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    alg = header.get("alg", "HS256")
    kid = header.get("kid", "")

    if alg == "HS256":
        _verify_hs256(parts, SUPABASE_JWT_SECRET)
    elif alg in ("RS256", "ES256"):
        _verify_asymmetric(parts, kid, alg)
    else:
        raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")

    return user_id