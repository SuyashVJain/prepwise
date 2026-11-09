"""
Run one voice tutor turn from the command line, without the browser.

Run from the backend directory:

    python -m scripts.voice_turn --text "Explain what a stack is"
    python -m scripts.voice_turn --audio question.wav
    python -m scripts.voice_turn --text "Explain recursion" --fake      # no network, no models

Each --text or --audio turn makes one LLM call. Audio chunks are written to
--out (a temporary folder by default) so you can listen to them.
"""
import argparse
import asyncio
import mimetypes
import os
import sys
import tempfile
import time

from app.voice import factory
from app.voice.conversation import NOT_IN_DOCUMENTS, REFUSAL_TEXT, Conversation
from app.voice.pipeline import run_turn


async def one_turn(conversation: Conversation, text: str, llm, tts, out_dir: str, label: str) -> None:
    extension = {"audio/wav": "wav", "audio/mpeg": "mp3"}

    async def emit(event: dict, audio):
        if event["type"] == "sentence":
            print(f"  tutor [{event['seq']}]: {event['text']}")
        elif event["type"] == "audio":
            path = os.path.join(out_dir, f"{label}_{event['seq']:02d}.{extension.get(event['mime'], 'bin')}")
            with open(path, "wb") as f:
                f.write(audio)
        elif event["type"] == "error":
            print(f"  ! {event['message']}")

    print(f"  student: {text}")
    result = await run_turn(
        conversation.build_prompt(text), llm, tts, emit, asyncio.Event(),
        refusal_sentinel=NOT_IN_DOCUMENTS, refusal_text=REFUSAL_TEXT,
    )
    conversation.add("student", text)
    conversation.add("tutor", result.text)
    print(f"  first sentence {result.first_sentence_ms} ms | first audio chunk {result.first_audio_ms} ms | "
          f"total {result.total_ms} ms | {result.audio_chunks} audio chunks | {len(result.text.split())} words")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run one voice tutor turn locally.")
    parser.add_argument("--text", help="a typed question")
    parser.add_argument("--audio", help="path to a recorded question (wav, mp3, webm, ogg)")
    parser.add_argument("--subject", default="")
    parser.add_argument("--topic", default="")
    parser.add_argument("--hinglish", action="store_true")
    parser.add_argument("--fake", action="store_true", help="use stand-in providers: no network, no models")
    parser.add_argument("--out", default=os.path.join(tempfile.gettempdir(), "prepwise_voice_turn"))
    args = parser.parse_args()
    if not args.text and not args.audio:
        parser.error("give --text, --audio or both")

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    os.makedirs(args.out, exist_ok=True)

    if args.fake:
        from app.voice.fakes import FakeLLM, FakeSTT, FakeTTS
        stt, tts, llm = FakeSTT(), FakeTTS(), FakeLLM()
    else:
        t = time.perf_counter()
        stt, tts, llm = factory.get_stt(), factory.get_tts(args.hinglish), factory.get_llm()
        print(f"speech-to-text: {factory.describe(stt)}")
        print(f"text-to-speech: {factory.describe(tts)}")
        print(f"providers ready in {time.perf_counter() - t:.1f}s (includes model download on first run)")

    conversation = Conversation(subject=args.subject, topic=args.topic, hinglish=args.hinglish)

    if args.text:
        print("\nTEXT TURN")
        await one_turn(conversation, args.text, llm, tts, args.out, "text")

    if args.audio:
        print("\nAUDIO TURN")
        with open(args.audio, "rb") as f:
            audio = f.read()
        mime = mimetypes.guess_type(args.audio)[0] or "audio/wav"
        t = time.perf_counter()
        heard = await asyncio.to_thread(stt.transcribe, audio, mime)
        print(f"  transcribed in {int((time.perf_counter() - t) * 1000)} ms with {stt.name}")
        if not heard:
            print("  nothing was recognised in the audio")
            return 1
        await one_turn(conversation, heard, llm, tts, args.out, "audio")

    print(f"\naudio written to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
