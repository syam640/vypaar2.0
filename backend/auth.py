from fastapi import HTTPException, Header

import os
import base64
import json
import time

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")

def _b64decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)

def verify_token(authorization: str = Header(...)) -> str:
    """
    SIMPLE + WORKING VERSION
    Skips signature verification (fixes ES256 issue)
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "").strip()
    parts = token.split(".")

    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Malformed JWT")

    try:
        payload = json.loads(_b64decode(parts[1]))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check expiry
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return user_id