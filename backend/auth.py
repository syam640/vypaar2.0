from fastapi import HTTPException, Header
from jose import jwt, JWTError
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def verify_token(authorization: str = Header(...)) -> str:
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the user's UUID (sub claim).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user ID")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
