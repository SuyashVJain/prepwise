"""Chooses the speech providers from settings and falls back along a chain when one is missing or fails."""
import threading
from typing import Optional

from app.config import VOICE_STT_PROVIDER, VOICE_TTS_HINDI_VOICE, VOICE_TTS_ORDER, VOICE_TTS_PROVIDER
from app.voice.providers import (
    EdgeTTS,
    FallbackSTT,
    FallbackTTS,
    GroqLLM,
    GroqTTS,
    GroqWhisperSTT,
    KokoroTTS,
    LLMProvider,
    LocalWhisperSTT,
    NoServerVoice,
    STTProvider,
    TTSProvider,
)

_lock = threading.Lock()
_stt: Optional[STTProvider] = None
_tts: Optional[TTSProvider] = None
_hinglish_tts: Optional[TTSProvider] = None
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


TTS_ENGINES = ("kokoro", "groq", "edge")


def tts_order(raw: Optional[str] = None, provider: Optional[str] = None) -> list[str]:
    """
    The server voice engines in the order to try them, from VOICE_TTS_ORDER (for example "groq,kokoro,browser").
    "browser" ends the list: the page uses the browser's own voice after the last server engine. When the variable is
    empty the order is Groq alone, with Kokoro first only if VOICE_TTS_PROVIDER=local.
    """
    raw = VOICE_TTS_ORDER if raw is None else raw
    provider = VOICE_TTS_PROVIDER if provider is None else provider
    if not raw.strip():
        return ["kokoro", "groq"] if provider == "local" else ["groq"]
    order: list[str] = []
    for part in raw.lower().split(","):
        name = part.strip()
        if name == "browser":
            break
        if name in TTS_ENGINES:
            if name not in order:
                order.append(name)
        elif name:
            print(f"voice: ignoring unknown engine '{name}' in VOICE_TTS_ORDER")
    return order


def get_tts(hinglish: bool = False) -> TTSProvider:
    """
    Text-to-speech following VOICE_TTS_ORDER. Kokoro is never loaded unless it is in the order. Hinglish uses Kokoro's
    Hindi voice when Kokoro is in the order, otherwise there is no server voice and the page uses the browser's voice.
    With no engine at all, building the provider fails with a plain reason, which the page treats like any voice failure.
    """
    global _tts, _hinglish_tts
    with _lock:
        order = tts_order()
        if hinglish:
            if _hinglish_tts is None:
                if "kokoro" in order:
                    _hinglish_tts = FallbackTTS(lambda: KokoroTTS(voice=VOICE_TTS_HINDI_VOICE, lang="hi"))
                else:
                    _hinglish_tts = FallbackTTS(NoServerVoice)
            return _hinglish_tts
        if _tts is None:
            engines = {"kokoro": KokoroTTS, "groq": GroqTTS, "edge": EdgeTTS}
            _tts = FallbackTTS(*[engines[name] for name in order]) if order else FallbackTTS(NoServerVoice)
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
    global _stt, _tts, _hinglish_tts, _llm
    with _lock:
        _stt = _tts = _hinglish_tts = _llm = None
