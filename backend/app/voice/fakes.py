"""Stand-in providers with no network and no models, for offline tests and the CLI's --fake mode."""
import time
from typing import Iterator, Optional

from app.voice.providers import LLMProvider, ProviderError, STTProvider, TTSProvider


class FakeSTT(STTProvider):
    name = "fake-stt"

    def __init__(self, text: str = "what is a stack", fail: bool = False):
        self.text = text
        self.fail = fail
        self.calls = 0

    def transcribe(self, audio: bytes, mime: str = "audio/webm", language: Optional[str] = None) -> str:
        self.calls += 1
        if self.fail:
            raise ProviderError("fake transcription failure")
        return self.text


class FakeTTS(TTSProvider):
    name = "fake-tts"
    mime = "audio/wav"

    def __init__(self, fail: bool = False, delay: float = 0.0):
        self.fail = fail
        self.delay = delay
        self.spoken: list[str] = []

    def synthesize(self, text: str) -> bytes:
        if self.delay:
            time.sleep(self.delay)
        if self.fail:
            raise ProviderError("fake synthesis failure")
        self.spoken.append(text)
        return b"RIFF" + text.encode("utf-8")


class FakeLLM(LLMProvider):
    name = "fake-llm"

    def __init__(self, reply: str = "", delay: float = 0.0, stream_fails: bool = False, fail: bool = False):
        self.reply = reply or (
            "A stack is a pile where you add and remove from the top only. "
            "Think of plates in a canteen. The last plate you put down is the first one you pick up. "
            "Which operation adds an item to a stack?"
        )
        self.delay = delay
        self.stream_fails = stream_fails
        self.fail = fail
        self.prompts: list[str] = []

    def stream(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> Iterator[str]:
        self.prompts.append(prompt)
        if self.stream_fails or self.fail:
            raise ProviderError("fake streaming failure")
        words = self.reply.split(" ")
        for i, word in enumerate(words):
            if self.delay:
                time.sleep(self.delay)
            yield word + (" " if i < len(words) - 1 else "")

    def complete(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> str:
        if not self.stream_fails:
            self.prompts.append(prompt)
        if self.fail:
            raise ProviderError("fake completion failure")
        return self.reply
