"""The cloud voice reports why it failed (type and HTTP status) without leaking the request address."""
import asyncio
import contextlib
import io
import sys
import types
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from app.voice.fakes import FakeLLM, FakeTTS  # noqa: E402
from app.voice.pipeline import run_turn  # noqa: E402
from app.voice.providers import EdgeTTS, ProviderError  # noqa: E402

SECRET_URL = "wss://example.invalid/synthesize?TrustedClientToken=SECRET123"


class Rejected(Exception):
    """Looks like the handshake error of the HTTP client: a status and a message that contains the address."""

    def __init__(self):
        super().__init__(f"403, message='Invalid response status', url='{SECRET_URL}'")
        self.status = 403


def fake_edge_tts():
    module = types.ModuleType("edge_tts")

    class Communicate:
        def __init__(self, text, voice):
            pass

        async def stream(self):
            raise Rejected()
            yield  # pragma: no cover  (makes this an async generator)

    module.Communicate = Communicate
    return module


class CloudVoiceLoggingTests(unittest.TestCase):
    def test_failure_names_the_type_and_status_but_not_the_address(self):
        out = io.StringIO()
        with mock.patch.dict(sys.modules, {"edge_tts": fake_edge_tts()}), contextlib.redirect_stdout(out):
            tts = EdgeTTS()
            with self.assertRaises(ProviderError) as ctx:
                tts.synthesize("hello")
        for text in (str(ctx.exception), out.getvalue()):
            self.assertIn("Rejected", text)
            self.assertIn("HTTP 403", text)
            self.assertNotIn("SECRET123", text)
            self.assertNotIn("example.invalid", text)

    def test_a_failed_reply_is_logged_once_and_stays_text_only(self):
        out = io.StringIO()
        events = []

        async def emit(event, audio):
            events.append(event)

        with contextlib.redirect_stdout(out):
            result = asyncio.run(run_turn("p", FakeLLM(), FakeTTS(fail=True), emit, asyncio.Event()))
        self.assertTrue(result.tts_error)
        self.assertEqual(out.getvalue().count("this reply is text only"), 1)
        self.assertEqual([e["code"] for e in events if e["type"] == "error"], ["tts_failed"])


if __name__ == "__main__":
    unittest.main()
