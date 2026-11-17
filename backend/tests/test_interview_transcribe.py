"""POST /interview/transcribe: voice answers go through the same speech-to-text as the voice tutor. No network, no models."""
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import interview  # noqa: E402
from app.voice import factory  # noqa: E402
from app.voice.fakes import FakeSTT  # noqa: E402


class TranscribeRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"Authorization": f"Bearer {offline_env.token('transcribe-user')}"}
        self.stt = FakeSTT(text="  a stack is last in first out  ")
        patcher = mock.patch.object(factory, "get_stt", lambda: self.stt)
        patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, data=b"fake-audio", name="answer.webm", mime="audio/webm", extra=None, headers=None):
        return self.client.post("/interview/transcribe", files={"file": (name, data, mime)}, data=extra or {}, headers=self.headers if headers is None else headers)

    def test_needs_a_token(self):
        self.assertEqual(self.post(headers={}).status_code, 401)

    def test_returns_the_trimmed_text(self):
        res = self.post()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"text": "a stack is last in first out"})
        self.assertEqual(self.stt.calls, 1)

    def test_no_speech_gives_empty_text_not_an_error(self):
        self.stt.text = ""
        res = self.post()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"text": ""})

    def test_an_empty_recording_is_a_400(self):
        self.assertEqual(self.post(data=b"").status_code, 400)
        self.assertEqual(self.stt.calls, 0)

    def test_a_recording_over_the_limit_is_a_413(self):
        with mock.patch.object(interview, "MAX_AUDIO_BYTES", 10):
            self.assertEqual(self.post(data=b"x" * 11).status_code, 413)
        self.assertEqual(self.stt.calls, 0)

    def test_a_speech_to_text_failure_is_a_502_without_the_reason(self):
        self.stt.fail = True
        res = self.post()
        self.assertEqual(res.status_code, 502)
        self.assertNotIn("fake transcription failure", res.text)
        self.assertIn("type your answer", res.json()["detail"])

    def test_the_mime_type_and_language_reach_the_speech_to_text(self):
        seen = {}

        class Recorder(FakeSTT):
            def transcribe(self, audio, mime="audio/webm", language=None):
                seen.update(mime=mime, language=language, size=len(audio))
                return "ok"

        with mock.patch.object(factory, "get_stt", lambda: Recorder()):
            self.post(data=b"abc", mime="audio/mp4", extra={"language": "en"})
        self.assertEqual(seen, {"mime": "audio/mp4", "language": "en", "size": 3})


if __name__ == "__main__":
    unittest.main()
