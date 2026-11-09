"""One tutor turn: transcribe, stream the reply and synthesize it sentence by sentence."""
import asyncio
import threading
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

from app.voice.providers import LLMProvider, TTSProvider
from app.voice.text import SentenceSplitter, clean_for_speech

# emit(event, audio_bytes_or_None)
Emit = Callable[[dict, Optional[bytes]], Awaitable[None]]


@dataclass
class TurnResult:
    text: str = ""
    sentences: list[str] = field(default_factory=list)
    cancelled: bool = False
    refused: bool = False
    first_sentence_ms: Optional[int] = None
    first_audio_ms: Optional[int] = None
    total_ms: int = 0
    audio_chunks: int = 0
    tts_error: str = ""


async def run_turn(
    prompt: str,
    llm: LLMProvider,
    tts: Optional[TTSProvider],
    emit: Emit,
    cancel: asyncio.Event,
    max_tokens: int = 500,
    refusal_sentinel: str = "",
    refusal_text: str = "",
) -> TurnResult:
    """
    Generate one tutor reply and speak it sentence by sentence. Each sentence is
    sent as text the moment it is complete and synthesized while the model keeps
    writing, so the first audio does not wait for the whole reply. Setting
    `cancel` stops generation and playback at once (barge-in).
    """
    started = time.perf_counter()
    result = TurnResult()
    loop = asyncio.get_running_loop()
    fragments: asyncio.Queue = asyncio.Queue()
    stop = threading.Event()

    def elapsed_ms() -> int:
        return int((time.perf_counter() - started) * 1000)

    def produce():
        try:
            got_any = False
            try:
                for fragment in llm.stream(prompt, max_tokens=max_tokens):
                    if stop.is_set():
                        return
                    got_any = True
                    loop.call_soon_threadsafe(fragments.put_nowait, ("text", fragment))
            except Exception:
                if got_any or stop.is_set():
                    raise
                # Streaming is unavailable: fall back to one full reply.
                loop.call_soon_threadsafe(fragments.put_nowait, ("text", llm.complete(prompt, max_tokens=max_tokens)))
            loop.call_soon_threadsafe(fragments.put_nowait, ("done", None))
        except Exception as e:
            loop.call_soon_threadsafe(fragments.put_nowait, ("error", e))

    to_speak: asyncio.Queue = asyncio.Queue()

    async def speak():
        while True:
            item = await to_speak.get()
            if item is None:
                return
            seq, sentence = item
            if tts is None or result.tts_error:
                continue
            spoken = clean_for_speech(sentence)
            if not spoken:
                continue
            try:
                audio = await asyncio.to_thread(tts.synthesize, spoken)
            except Exception as e:
                # Keep the text flowing even if the voice fails.
                result.tts_error = str(e)
                await emit({"type": "error", "code": "tts_failed", "message": "Voice output failed; showing text only."}, None)
                continue
            if cancel.is_set():
                return
            if result.first_audio_ms is None:
                result.first_audio_ms = elapsed_ms()
            result.audio_chunks += 1
            await emit({"type": "audio", "seq": seq, "mime": tts.mime}, audio)

    async def say(sentence: str):
        result.sentences.append(sentence)
        if result.first_sentence_ms is None:
            result.first_sentence_ms = elapsed_ms()
        seq = len(result.sentences)
        await emit({"type": "sentence", "seq": seq, "text": sentence}, None)
        to_speak.put_nowait((seq, sentence))

    producer = threading.Thread(target=produce, daemon=True)
    producer.start()
    speaker = asyncio.create_task(speak())
    cancel_wait = asyncio.create_task(cancel.wait())

    splitter = SentenceSplitter()
    held = ""  # text held back until we know the reply is not the refusal sentinel
    checking = bool(refusal_sentinel)
    error: Optional[Exception] = None

    try:
        while True:
            get = asyncio.create_task(fragments.get())
            await asyncio.wait({get, cancel_wait}, return_when=asyncio.FIRST_COMPLETED)
            if cancel.is_set():
                get.cancel()
                result.cancelled = True
                break
            kind, value = get.result()

            if kind == "error":
                error = value
                break

            if kind == "text":
                if checking:
                    held += value
                    stripped = held.strip()
                    if len(stripped) < len(refusal_sentinel) and refusal_sentinel.startswith(stripped):
                        continue
                    if stripped.startswith(refusal_sentinel):
                        result.refused = True
                        break
                    checking = False
                    value, held = held, ""
                for sentence in splitter.feed(value):
                    await say(sentence)
                continue

            # done
            if checking and held.strip():
                if held.strip().startswith(refusal_sentinel):
                    result.refused = True
                else:
                    for sentence in splitter.feed(held):
                        await say(sentence)
            if not result.refused:
                for sentence in splitter.flush():
                    await say(sentence)
            break

        if result.refused:
            for sentence in SentenceSplitter().feed(refusal_text + " "):
                await say(sentence)

        if result.cancelled:
            speaker.cancel()
        else:
            to_speak.put_nowait(None)
            speak_done = asyncio.ensure_future(speaker)
            await asyncio.wait({speak_done, cancel_wait}, return_when=asyncio.FIRST_COMPLETED)
            if cancel.is_set() and not speaker.done():
                speaker.cancel()
                result.cancelled = True
    finally:
        stop.set()
        cancel_wait.cancel()
        if not speaker.done():
            speaker.cancel()
        await asyncio.gather(speaker, return_exceptions=True)

    result.text = " ".join(result.sentences)
    result.total_ms = elapsed_ms()
    if error is not None and not result.sentences:
        raise error
    return result
