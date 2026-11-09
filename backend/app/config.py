"""Settings read once from environment variables. Nothing secret has a default value."""
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL") or "openai/gpt-oss-120b"
# Reasoning effort for models that support it. Set to "none" to leave the option out.
LLM_REASONING_EFFORT = os.getenv("LLM_REASONING_EFFORT") or "low"
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
# Only needed for projects still on the legacy HS256 shared secret.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Per-user rate limits, e.g. "30/minute".
RATE_LIMIT_LLM = os.getenv("RATE_LIMIT_LLM") or "30/minute"
RATE_LIMIT_UPLOAD = os.getenv("RATE_LIMIT_UPLOAD") or "10/minute"
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT") or "120/minute"
# Voice tutor turns per user. Each turn is one LLM call.
RATE_LIMIT_TUTOR = os.getenv("RATE_LIMIT_TUTOR") or "20/minute"

# Voice tutor. "local" runs speech models on this machine and falls back to the
# cloud provider if they cannot load; "cloud" skips the local models.
VOICE_STT_PROVIDER = (os.getenv("VOICE_STT_PROVIDER") or "local").lower()
VOICE_TTS_PROVIDER = (os.getenv("VOICE_TTS_PROVIDER") or "local").lower()
# "base" transcribes a short question in well under a second on a laptop CPU; "small" is more accurate but about three times slower there.
VOICE_STT_MODEL = os.getenv("VOICE_STT_MODEL") or "base"
VOICE_STT_CLOUD_MODEL = os.getenv("VOICE_STT_CLOUD_MODEL") or "whisper-large-v3-turbo"
VOICE_TTS_VOICE = os.getenv("VOICE_TTS_VOICE") or "af_heart"
VOICE_TTS_MODEL_FILE = os.getenv("VOICE_TTS_MODEL_FILE") or "kokoro-v1.0.int8.onnx"
VOICE_TTS_CLOUD_VOICE = os.getenv("VOICE_TTS_CLOUD_VOICE") or "en-IN-NeerjaNeural"
# Load the speech models when the server starts instead of on the first tutor question.
VOICE_WARMUP = (os.getenv("VOICE_WARMUP") or "1").lower() not in ("0", "false", "no", "off")
# Speech models are cached here, outside the repo.
VOICE_MODEL_DIR = os.getenv("VOICE_MODEL_DIR") or os.path.join(os.path.expanduser("~"), ".cache", "prepwise", "voice")

# Optional. Without it the tutor shows only the hand-picked videos.
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") or ""
