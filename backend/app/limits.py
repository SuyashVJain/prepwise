"""Per-user rate limits, shared by route group, and the 429 response."""
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from limits import parse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import RATE_LIMIT_LLM, RATE_LIMIT_UPLOAD, RATE_LIMIT_DEFAULT, RATE_LIMIT_TUTOR


def rate_limit_key(request: Request) -> str:
    """Limit per user when the request is authenticated, per client IP otherwise."""
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=rate_limit_key)

# Each group is one shared budget per user, not a separate budget per route.
llm_limit = limiter.shared_limit(RATE_LIMIT_LLM, scope="llm")
upload_limit = limiter.shared_limit(RATE_LIMIT_UPLOAD, scope="upload")
default_limit = limiter.shared_limit(RATE_LIMIT_DEFAULT, scope="default")


_tutor_limit = parse(RATE_LIMIT_TUTOR)


def tutor_turn_allowed(user_id: str) -> bool:
    """Count one voice tutor turn for this user. WebSocket messages do not pass through the route decorators."""
    return limiter.limiter.hit(_tutor_limit, "tutor", f"user:{user_id}")


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = exc.limit.limit.get_expiry()
    try:
        item, args = request.state.view_rate_limit
        reset_at = limiter.limiter.get_window_stats(item, *args)[0]
        retry_after = max(1, int(reset_at - time.time()) + 1)
    except Exception:
        pass

    if request.url.path.startswith("/demo/"):
        return JSONResponse(
            status_code=429,
            content={"limited": True, "message": "The demo is busy, sign up to continue."},
            headers={"Retry-After": str(retry_after)},
        )

    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a moment."},
        headers={"Retry-After": str(retry_after)},
    )
