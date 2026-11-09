"""Speech to text, language model and text to speech: the provider interfaces and their implementations."""
import asyncio
import io
import os
import wave
from abc import ABC, abstractmethod
from typing import Callable, Iterator, Optional

from app.config import (
    VOICE_MODEL_DIR,
    VOICE_STT_CLOUD_MODEL,
    VOICE_STT_MODEL,
    VOICE_TTS_CLOUD_VOICE,
    VOICE_TTS_MODEL_FILE,
    VOICE_TTS_VOICE,
)


class ProviderError(RuntimeError):
    """A voice provider could not load or could not complete a request."""


class STTProvider(ABC):
    name = "stt"

    @abstractmethod
    def transcribe(self, audio: bytes, mime: str = "audio/webm", language: Optional[str] = None) -> str:
        """Return the spoken text in an audio clip."""


class TTSProvider(ABC):
    name = "tts"
    mime = "audio/wav"

    @abstractmethod
    def synthesize(self, text: str) -> bytes:
        """Return encoded audio for one sentence."""


class LLMProvider(ABC):
    name = "llm"

    @abstractmethod
    def stream(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> Iterator[str]:
        """Yield the reply as text fragments."""

    @abstractmethod
    def complete(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> str:
        """Return the whole reply at once."""


# ── SPEECH TO TEXT ──

def _add_nvidia_dll_dirs() -> None:
    """
    On Windows, let the GPU runtime find cuBLAS and cuDNN when they were installed
    with pip (nvidia-cublas-cu12, nvidia-cudnn-cu12) instead of system-wide.
    """
    if os.name != "nt":
        return
    try:
        import importlib.util

        spec = importlib.util.find_spec("nvidia")
        for root in (spec.submodule_search_locations if spec else []):
            for package in os.listdir(root):
                bin_dir = os.path.join(root, package, "bin")
                if os.path.isdir(bin_dir):
                    os.add_dll_directory(bin_dir)
                    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass


def _cuda_usable() -> bool:
    """True when a CUDA device is visible AND its cuBLAS runtime can be loaded. Seeing the card alone is not enough."""
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() < 1:
            return False
        if os.name == "nt":
            import ctypes

            ctypes.WinDLL("cublas64_12.dll")
        return True
    except Exception:
        return False


class LocalWhisperSTT(STTProvider):
    """faster-whisper with int8 weights, on the GPU when CUDA is usable, else on the CPU."""

    name = "local-whisper"

    def __init__(self, model_size: str = VOICE_STT_MODEL, model_dir: str = VOICE_MODEL_DIR):
        _add_nvidia_dll_dirs()
        try:
            import ctranslate2
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise ProviderError(f"faster-whisper is not installed ({e})")

        self._model_class = WhisperModel
        self._model_size = model_size
        self._model_dir = os.path.join(model_dir, "whisper")
        os.makedirs(self._model_dir, exist_ok=True)

        self.device = "cuda" if _cuda_usable() else "cpu"
        try:
            self._model = self._load(self.device)
        except Exception as e:
            if self.device != "cuda":
                raise ProviderError(f"could not load the whisper model ({e})")
            self.device = "cpu"
            self._model = self._load("cpu")
        self.name = f"local-whisper-{model_size}-{self.device}"
        # Decode a second of noise now. This settles GPU-or-CPU at load time, so the
        # first real question is not the one that discovers a missing GPU library.
        import random

        noise = pcm_to_wav([random.uniform(-0.2, 0.2) for _ in range(16000)], 16000)
        self.transcribe(noise, "audio/wav", "en", vad_filter=False)

    def _load(self, device: str):
        return self._model_class(self._model_size, device=device, compute_type="int8", download_root=self._model_dir)

    def _run(self, audio: bytes, language: Optional[str], vad_filter: bool = True) -> str:
        segments, _ = self._model.transcribe(io.BytesIO(audio), language=language, beam_size=1, vad_filter=vad_filter)
        return " ".join(segment.text.strip() for segment in segments).strip()

    def transcribe(self, audio: bytes, mime: str = "audio/webm", language: Optional[str] = None, vad_filter: bool = True) -> str:
        try:
            return self._run(audio, language, vad_filter)
        except Exception as e:
            # CUDA can report as available and still fail at run time when its
            # runtime libraries (cuBLAS, cuDNN) are missing. Drop to the CPU once and retry.
            gpu_problem = self.device == "cuda" and any(word in str(e).lower() for word in ("cuda", "cublas", "cudnn", "gpu"))
            if not gpu_problem:
                raise ProviderError(f"local transcription failed ({type(e).__name__}: {e})")
            print(f"voice: GPU transcription failed ({e}); switching whisper to CPU")
            self.device = "cpu"
            self._model = self._load("cpu")
            self.name = f"local-whisper-{self._model_size}-cpu"
            return self._run(audio, language, vad_filter)


class GroqWhisperSTT(STTProvider):
    """Hosted Whisper through the same Groq account as the LLM."""

    name = "cloud-whisper"

    def __init__(self, model: str = VOICE_STT_CLOUD_MODEL):
        self._model = model

    def transcribe(self, audio: bytes, mime: str = "audio/webm", language: Optional[str] = None) -> str:
        from app.services.gemini import get_client

        extension = {"audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/mp4": "m4a"}.get(
            mime.split(";")[0].strip(), "webm"
        )
        options = {"language": language} if language else {}
        try:
            result = get_client().audio.transcriptions.create(
                file=(f"speech.{extension}", audio),
                model=self._model,
                **options,
            )
        except Exception as e:
            raise ProviderError(f"cloud transcription failed ({type(e).__name__}: {e})")
        return (result.text or "").strip()


# ── TEXT TO SPEECH ──

KOKORO_RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"


def _download(url: str, path: str) -> None:
    import httpx

    partial = path + ".part"
    with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as response:
        response.raise_for_status()
        with open(partial, "wb") as f:
            for chunk in response.iter_bytes(1 << 20):
                f.write(chunk)
    os.replace(partial, path)


def pcm_to_wav(samples, sample_rate: int) -> bytes:
    """Encode float samples in [-1, 1] as 16-bit mono WAV."""
    import numpy as np

    pcm = (np.clip(np.asarray(samples, dtype="float32"), -1.0, 1.0) * 32767).astype("<i2")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(pcm.tobytes())
    return buffer.getvalue()


class KokoroTTS(TTSProvider):
    """Kokoro through ONNX Runtime. Runs on the CPU; model files are fetched once into the cache directory."""

    name = "local-kokoro"
    mime = "audio/wav"

    def __init__(self, voice: str = VOICE_TTS_VOICE, model_dir: str = VOICE_MODEL_DIR, model_file: str = VOICE_TTS_MODEL_FILE):
        try:
            from kokoro_onnx import Kokoro
        except ImportError as e:
            raise ProviderError(f"kokoro-onnx is not installed ({e})")

        directory = os.path.join(model_dir, "kokoro")
        os.makedirs(directory, exist_ok=True)
        model_path = os.path.join(directory, model_file)
        voices_path = os.path.join(directory, "voices-v1.0.bin")
        try:
            for path in (model_path, voices_path):
                if not os.path.exists(path):
                    print(f"voice: downloading {os.path.basename(path)} to {directory} (first run only)")
                    _download(f"{KOKORO_RELEASE}/{os.path.basename(path)}", path)
            self._kokoro = Kokoro(model_path, voices_path)
        except Exception as e:
            raise ProviderError(f"could not load the Kokoro model ({type(e).__name__}: {e})")
        self._voice = voice
        # The first synthesis after loading is several times slower; spend it here, not on the first reply.
        self.synthesize("Ready.")

    def synthesize(self, text: str) -> bytes:
        try:
            samples, sample_rate = self._kokoro.create(text, voice=self._voice, speed=1.0, lang="en-us")
        except Exception as e:
            raise ProviderError(f"local speech synthesis failed ({type(e).__name__}: {e})")
        return pcm_to_wav(samples, sample_rate)


class EdgeTTS(TTSProvider):
    """Hosted neural voice. Needs internet, no key."""

    name = "cloud-edge-tts"
    mime = "audio/mpeg"

    def __init__(self, voice: str = VOICE_TTS_CLOUD_VOICE):
        try:
            import edge_tts
        except ImportError as e:
            raise ProviderError(f"edge-tts is not installed ({e})")
        self._edge_tts = edge_tts
        self._voice = voice
        self.name = f"cloud-edge-tts-{voice}"

    async def _collect(self, text: str) -> bytes:
        audio = bytearray()
        async for chunk in self._edge_tts.Communicate(text, self._voice).stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        return bytes(audio)

    def synthesize(self, text: str) -> bytes:
        try:
            audio = asyncio.run(self._collect(text))
        except Exception as e:
            raise ProviderError(f"cloud speech synthesis failed ({type(e).__name__}: {e})")
        if not audio:
            raise ProviderError("cloud speech synthesis returned no audio")
        return audio


# ── LLM ──

class GroqLLM(LLMProvider):
    """The app's existing LLM call, whatever LLM_MODEL is set to."""

    name = "groq"

    def stream(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> Iterator[str]:
        from app.services.gemini import stream_llm

        return stream_llm(prompt, temperature=temperature, max_tokens=max_tokens)

    def complete(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> str:
        from app.services.gemini import call_llm

        return call_llm(prompt, temperature=temperature, max_tokens=max_tokens)


# ── FALLBACK ──

class FallbackSTT(STTProvider):
    """Uses the preferred provider until it fails to load or to answer, then the fallback for good."""

    def __init__(self, preferred: Callable[[], STTProvider], fallback: Callable[[], STTProvider]):
        self._chain = _Chain(preferred, fallback)

    @property
    def name(self) -> str:  # type: ignore[override]
        return self._chain.provider().name

    @property
    def fell_back(self) -> bool:
        return self._chain.fell_back

    @property
    def reason(self) -> str:
        return self._chain.reason

    def transcribe(self, audio: bytes, mime: str = "audio/webm", language: Optional[str] = None) -> str:
        return self._chain.call(lambda p: p.transcribe(audio, mime, language))


class FallbackTTS(TTSProvider):
    def __init__(self, preferred: Callable[[], TTSProvider], fallback: Callable[[], TTSProvider]):
        self._chain = _Chain(preferred, fallback)

    @property
    def name(self) -> str:  # type: ignore[override]
        return self._chain.provider().name

    @property
    def mime(self) -> str:  # type: ignore[override]
        return self._chain.provider().mime

    @property
    def fell_back(self) -> bool:
        return self._chain.fell_back

    @property
    def reason(self) -> str:
        return self._chain.reason

    def synthesize(self, text: str) -> bytes:
        return self._chain.call(lambda p: p.synthesize(text))


class _Chain:
    def __init__(self, preferred: Callable, fallback: Callable):
        self._factories = [preferred, fallback]
        self._provider = None
        self.fell_back = False
        self.reason = ""

    def provider(self):
        if self._provider is None:
            try:
                self._provider = self._factories[0]()
            except Exception as e:
                self._switch(e)
        return self._provider

    def _switch(self, error: Exception):
        if self.fell_back:
            raise ProviderError(f"both providers failed ({error})")
        self.fell_back = True
        self.reason = str(error)
        print(f"voice: preferred provider unavailable, using the fallback ({error})")
        self._provider = self._factories[1]()

    def call(self, action: Callable):
        provider = self.provider()
        try:
            return action(provider)
        except Exception as e:
            if self.fell_back:
                raise
            self._switch(e)
            return action(self._provider)
