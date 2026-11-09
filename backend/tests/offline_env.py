"""
Environment for offline tests: a local token secret, no LLM key, and small rate limits.
Must be applied before app.config is first imported, because settings are read once.
"""
import os
import time

TEST_SECRET = "offline-test-secret-not-used-anywhere-else-0123456789"
TEST_SUPABASE_URL = "https://example.invalid"
TUTOR_TURNS_PER_MINUTE = 5

_SETTINGS = {
    "SUPABASE_URL": TEST_SUPABASE_URL,
    "SUPABASE_JWT_SECRET": TEST_SECRET,
    "GROQ_API_KEY": "",
    "YOUTUBE_API_KEY": "",
    "RATE_LIMIT_TUTOR": f"{TUTOR_TURNS_PER_MINUTE}/minute",
    "RATE_LIMIT_LLM": "30/minute",
    "RATE_LIMIT_DEFAULT": "120/minute",
    "VOICE_STT_PROVIDER": "local",
    "VOICE_TTS_PROVIDER": "local",
    "VOICE_WARMUP": "0",
}


def apply() -> None:
    os.environ.update(_SETTINGS)


def token(user: str = "test-user", expires_in: int = 600) -> str:
    """A locally signed access token shaped like a Supabase one."""
    import jwt

    claims = {"sub": user, "aud": "authenticated", "iss": f"{TEST_SUPABASE_URL}/auth/v1", "exp": int(time.time()) + expires_in}
    return jwt.encode(claims, TEST_SECRET, "HS256")
