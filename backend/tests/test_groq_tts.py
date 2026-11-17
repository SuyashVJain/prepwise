"""Groq speech: chunking for the 200 character limit, joining the pieces, status-only error logs and the fallback order. No network."""
import contextlib
import importlib
import io
import os
import unittest
import wave
from unittest import mock

from fastapi import HTTPException

from tests import offline_env

offline_env.apply()

from app import config  # noqa: E402
from app.voice import factory  # noqa: E402
from app.voice.fakes import FakeTTS  # noqa: E402
from app.voice.providers import GROQ_TTS_MAX_CHARS, GroqTTS, ProviderError, join_wavs  # noqa: E402
from app.voice.text import chunk_text  # noqa: E402


def wav(frames: int, rate: int = 24000, channels: int = 1) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as f:
        f.setnchannels(channels)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(b"\x01\x00" * frames * channels)
    return buffer.getvalue()


def frames_of(data: bytes) -> int:
    with wave.open(io.BytesIO(data), "rb") as f:
        return f.getnframes()


class ChunkTextTests(unittest.TestCase):
    def test_a_short_reply_is_one_chunk(self):
        self.assertEqual(chunk_text("A stack adds and removes at the top."), ["A stack adds and removes at the top."])

    def test_sentences_stay_separate_and_in_order(self):
        text = "Stacks are last in first out. Queues are first in first out. Both are linear structures."
        self.assertEqual(chunk_text(text), ["Stacks are last in first out.", "Queues are first in first out.", "Both are linear structures."])

    def test_a_sentence_longer_than_200_characters_is_split_under_the_limit_without_losing_words(self):
        sentence = ("Because a deadlock needs mutual exclusion, hold and wait, no preemption and a circular wait all at the same time, "
                    "removing any one of those four conditions is enough to prevent it, which is why operating systems usually break "
                    "circular wait by ordering resources")
        self.assertGreater(len(sentence), 200)
        chunks = chunk_text(sentence)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(0 < len(c) <= GROQ_TTS_MAX_CHARS for c in chunks))
        self.assertEqual(" ".join(chunks).split(), sentence.split())

    def test_a_long_sentence_is_cut_at_a_comma_when_there_is_one(self):
        sentence = ("First we write down every resource the process holds and every one it is still waiting for, "
                    "and then we look for a cycle in that graph of waits because a cycle means that none of them can ever continue at all.")
        chunks = chunk_text(sentence)
        self.assertTrue(chunks[0].endswith(","))
        self.assertTrue(all(len(c) <= 200 for c in chunks))

    def test_text_with_no_spaces_is_cut_at_the_limit(self):
        chunks = chunk_text("a" * 450)
        self.assertEqual([len(c) for c in chunks], [200, 200, 50])

    def test_blank_text_gives_no_chunks(self):
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_text("   \n  "), [])

    def test_every_chunk_of_a_long_reply_is_under_the_limit(self):
        reply = " ".join(f"Sentence number {i} explains one more small idea about processes and threads." for i in range(30))
        self.assertTrue(all(len(c) <= 200 for c in chunk_text(reply)))


class JoinWavsTests(unittest.TestCase):
    def test_one_piece_is_returned_as_it_is(self):
        data = wav(10)
        self.assertEqual(join_wavs([data]), data)

    def test_pieces_are_joined_in_order_into_one_valid_wav(self):
        joined = join_wavs([wav(100), wav(250), wav(50)])
        self.assertEqual(frames_of(joined), 400)
        with wave.open(io.BytesIO(joined), "rb") as f:
            self.assertEqual((f.getnchannels(), f.getframerate()), (1, 24000))

    def test_different_formats_are_refused(self):
        with self.assertRaises(ProviderError):
            join_wavs([wav(10, rate=24000), wav(10, rate=16000)])

    def test_a_piece_that_is_not_a_wav_is_refused(self):
        with self.assertRaises(ProviderError):
            join_wavs([wav(10), b"not audio"])


class FakeSpeech:
    def __init__(self, fail_with=None):
        self.calls = []
        self.fail_with = fail_with

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail_with:
            raise self.fail_with
        body = wav(100 * len(self.calls))
        return mock.Mock(read=lambda: body)


class FakeClient:
    def __init__(self, speech):
        self.audio = mock.Mock(speech=speech)


class RateLimited(Exception):
    status_code = 429


def groq_tts(speech):
    with mock.patch("app.services.gemini.get_client", return_value=FakeClient(speech)):
        return GroqTTS()


class GroqTTSTests(unittest.TestCase):
    def test_defaults_to_the_hannah_voice_and_the_orpheus_model_and_asks_for_wav(self):
        speech = FakeSpeech()
        tts = groq_tts(speech)
        tts.synthesize("A stack adds and removes at the top.")
        call = speech.calls[0]
        self.assertEqual(call["model"], "canopylabs/orpheus-v1-english")
        self.assertEqual(call["voice"], "hannah")
        self.assertEqual(call["response_format"], "wav")
        self.assertEqual(tts.mime, "audio/wav")
        self.assertEqual(tts.name, "cloud-groq-hannah")

    def test_a_long_sentence_is_sent_in_pieces_under_200_characters_and_the_audio_is_joined(self):
        speech = FakeSpeech()
        text = ("Because a deadlock needs mutual exclusion, hold and wait, no preemption and a circular wait all at the same time, "
                "removing any one of those four conditions is enough to prevent it, which is why operating systems usually break "
                "circular wait by ordering resources")
        audio = groq_tts(speech).synthesize(text)
        sent = [c["input"] for c in speech.calls]
        self.assertGreater(len(sent), 1)
        self.assertTrue(all(len(s) <= 200 for s in sent))
        self.assertEqual(" ".join(sent).split(), text.split())
        self.assertEqual(frames_of(audio), sum(100 * (i + 1) for i in range(len(sent))))

    def test_a_failed_call_logs_the_status_code_only(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            with self.assertRaises(ProviderError) as ctx:
                groq_tts(FakeSpeech(fail_with=RateLimited("quota details that should not be logged"))).synthesize("Hello there, student.")
        self.assertIn("HTTP 429", str(ctx.exception))
        self.assertIn("HTTP 429", out.getvalue())
        self.assertNotIn("quota details", out.getvalue() + str(ctx.exception))

    def test_without_a_key_the_voice_is_unavailable(self):
        no_key = HTTPException(status_code=503, detail="GROQ_API_KEY is not set on the server, so LLM features are unavailable.")
        with mock.patch("app.services.gemini.get_client", side_effect=no_key):
            with self.assertRaises(ProviderError):
                GroqTTS()


class CloudVoiceSettingTests(unittest.TestCase):
    def reload_with(self, **env):
        keys = ("VOICE_TTS_CLOUD_VOICE", "VOICE_TTS_EDGE_VOICE", "VOICE_TTS_CLOUD_MODEL")
        with mock.patch.dict(os.environ, {k: v for k, v in env.items()}, clear=False):
            for k in keys:
                if k not in env:
                    os.environ.pop(k, None)
            with mock.patch("dotenv.load_dotenv", lambda *a, **k: False):
                importlib.reload(config)
            return config.VOICE_TTS_CLOUD_VOICE, config.VOICE_TTS_EDGE_VOICE, config.VOICE_TTS_CLOUD_MODEL

    def tearDown(self):
        importlib.reload(config)

    def test_defaults(self):
        self.assertEqual(self.reload_with(), ("hannah", "en-IN-NeerjaNeural", "canopylabs/orpheus-v1-english"))

    def test_a_groq_voice_can_be_chosen(self):
        self.assertEqual(self.reload_with(VOICE_TTS_CLOUD_VOICE="diana")[0], "diana")

    def test_an_old_edge_voice_name_goes_to_edge_and_groq_keeps_its_default(self):
        groq, edge, _ = self.reload_with(VOICE_TTS_CLOUD_VOICE="en-IN-PrabhatNeural")
        self.assertEqual((groq, edge), ("hannah", "en-IN-PrabhatNeural"))


class RecordingProvider(FakeTTS):
    """A fake voice that records when it is built and used, in one shared list."""

    def __init__(self, label, events, fail_on_synthesize=False):
        super().__init__(fail=fail_on_synthesize)
        self.name = label
        self._label = label
        self._events = events

    def synthesize(self, text):
        self._events.append(f"{self._label}:synthesize")
        return super().synthesize(text)


def builder(label, events, fail_to_build=False, fail_on_synthesize=False):
    def build():
        events.append(f"{label}:build")
        if fail_to_build:
            raise ProviderError(f"{label} is not available")
        return RecordingProvider(label, events, fail_on_synthesize)

    return build


class FallbackOrderTests(unittest.TestCase):
    def setUp(self):
        factory.reset()
        self.addCleanup(factory.reset)
        self.events = []

    def patched(self, kokoro, groq, edge, provider="local"):
        return (
            mock.patch.object(factory, "KokoroTTS", kokoro), mock.patch.object(factory, "GroqTTS", groq),
            mock.patch.object(factory, "EdgeTTS", edge), mock.patch.object(factory, "VOICE_TTS_PROVIDER", provider),
        )

    def run_with(self, *patches):
        stack = contextlib.ExitStack()
        for p in patches:
            stack.enter_context(p)
        return stack

    def test_local_voice_first_then_groq_then_edge(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e, fail_to_build=True), builder("groq", e, fail_on_synthesize=True), builder("edge", e))):
            tts = factory.get_tts()
            tts.synthesize("hello there friend")
        self.assertEqual(e, ["kokoro:build", "groq:build", "groq:synthesize", "edge:build", "edge:synthesize"])
        self.assertEqual(tts.name, "edge")
        self.assertTrue(tts.fell_back)

    def test_the_local_voice_is_used_alone_while_it_works(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e), builder("groq", e), builder("edge", e))):
            factory.get_tts().synthesize("hello there friend")
        self.assertEqual(e, ["kokoro:build", "kokoro:synthesize"])

    def test_the_cloud_setting_goes_groq_then_edge_and_never_touches_the_local_voice(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e), builder("groq", e, fail_to_build=True), builder("edge", e), provider="cloud")):
            factory.get_tts().synthesize("hello there friend")
        self.assertEqual(e, ["groq:build", "edge:build", "edge:synthesize"])

    def test_groq_is_the_cloud_voice_when_it_works(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e), builder("groq", e), builder("edge", e), provider="cloud")):
            tts = factory.get_tts()
            tts.synthesize("hello there friend")
        self.assertEqual(e, ["groq:build", "groq:synthesize"])
        self.assertFalse(tts.fell_back)

    def test_hinglish_uses_the_cloud_chain_even_when_local_is_configured(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e), builder("groq", e), builder("edge", e))):
            factory.get_tts(hinglish=True).synthesize("namaste dost")
        self.assertEqual(e, ["groq:build", "groq:synthesize"])

    def test_when_every_server_voice_fails_the_error_reaches_the_pipeline(self):
        e = self.events
        with self.run_with(*self.patched(builder("kokoro", e, fail_to_build=True), builder("groq", e, fail_to_build=True), builder("edge", e, fail_to_build=True))):
            with self.assertRaises(ProviderError) as ctx:
                factory.get_tts().synthesize("hello there friend")
        self.assertIn("all providers failed", str(ctx.exception))
        self.assertEqual(e, ["kokoro:build", "groq:build", "edge:build"])


if __name__ == "__main__":
    unittest.main()
