"""Chooses the speech providers from settings and falls back to cloud ones when a local model is missing."""
import threading
from typing import Optional

from app.config import VOICE_STT_PROVIDER, VOICE_TTS_PROVIDER
from app.voice.providers import (
    EdgeTTS,
    FallbackSTT,
    FallbackTTS,
    GroqLLM,
    GroqWhisperSTT,
    KokoroTTS,
    LLMProvider,
    LocalWhisperSTT,
    STTProvider,
    TTSProvider,
)

_lock = threading.Lock()
_stt: Optional[STTProvider] = None
_tts: Optional[TTSProvider] = None
_cloud_tts: Optional[TTSProvider] = None
_llm: Optional[LLMProvider] = None


def get_stt() -> STTProvider:
    """Speech-to-text chosen by VOICE_STT_PROVIDER; a local provider falls back to the cloud one."""
    global _stt
    with _lock:
        if _stt is None:
            if VOICE_STT_PROVIDER == "cloud":
                _stt = GroqWhisperSTT()
            else:
                _stt = FallbackSTT(LocalWhisperSTT, GroqWhisperSTT)
        return _stt


def get_tts(hinglish: bool = False) -> TTSProvider:
    """
    Text-to-speech chosen by VOICE_TTS_PROVIDER. Hinglish always uses the cloud
    voice: the local English voice mispronounces Roman-script Hindi.
    """
    global _tts, _cloud_tts
    with _lock:
        if hinglish or VOICE_TTS_PROVIDER == "cloud":
            if _cloud_tts is None:
                _cloud_tts = EdgeTTS()
            return _cloud_tts
        if _tts is None:
            _tts = FallbackTTS(KokoroTTS, EdgeTTS)
        return _tts


def get_llm() -> LLMProvider:
    global _llm
    with _lock:
        if _llm is None:
            _llm = GroqLLM()
        return _llm


def describe(provider) -> dict:
    """Which provider is active, for the frontend. Loads the provider if it is not loaded yet."""
    try:
        name = provider.name
    except Exception as e:
        return {"active": "unavailable", "fell_back": True, "reason": str(e)}
    return {
        "active": name,
        "fell_back": bool(getattr(provider, "fell_back", False)),
        "reason": getattr(provider, "reason", ""),
    }


def reset() -> None:
    """Forget loaded providers. Used by tests."""
    global _stt, _tts, _cloud_tts, _llm
    with _lock:
        _stt = _tts = _cloud_tts = _llm = None
