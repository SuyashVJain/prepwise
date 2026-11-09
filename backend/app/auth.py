"""Verify Supabase access tokens (signing keys, or the legacy shared secret) and give routes the signed-in user."""
from typing import Optional

import jwt
from fastapi import Header, HTTPException, Request
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.config import SUPABASE_URL, SUPABASE_JWT_SECRET

AUDIENCE = "authenticated"
ASYMMETRIC_ALGS = ["ES256", "RS256"]

_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not SUPABASE_URL:
            raise HTTPException(status_code=500, detail="SUPABASE_URL is not set on the server.")
        _jwks_client = PyJWKClient(
            f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
        )
    return _jwks_client


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_access_token(token: str) -> str:
    """Verify a Supabase access token and return the user id (the `sub` claim). Raises 401 if it is not valid."""
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError:
        raise _unauthorized("Malformed token.")

    options = {"require": ["exp", "sub"]}
    issuer = f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None

    try:
        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise _unauthorized("Token signing method is not accepted.")
            key, algorithms = SUPABASE_JWT_SECRET, ["HS256"]
        elif alg in ASYMMETRIC_ALGS:
            key, algorithms = _get_jwks_client().get_signing_key_from_jwt(token).key, ASYMMETRIC_ALGS
        else:
            raise _unauthorized("Token signing method is not accepted.")

        claims = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=AUDIENCE,
            issuer=issuer,
            options=options,
        )
    except PyJWKClientConnectionError:
        raise HTTPException(status_code=503, detail="Could not reach the auth server to verify the token.")
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token has expired.")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid token.")

    return claims["sub"]


def get_current_user(request: Request, authorization: Optional[str] = Header(default=None)) -> str:
    """
    Verify the Supabase access token sent as `Authorization: Bearer <token>`
    and return the user id (the `sub` claim).

    Supabase signs tokens with an asymmetric key published at the project's
    JWKS endpoint. Projects still on the legacy shared secret sign with HS256,
    which is verified against SUPABASE_JWT_SECRET when it is set.
    """
    if not authorization:
        raise _unauthorized("Missing Authorization header.")

    scheme, _, token = authorization.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("Authorization header must be 'Bearer <token>'.")

    user_id = verify_access_token(token)
    # Read by the rate limiter to key limits per user.
    request.state.user_id = user_id
    return user_id
