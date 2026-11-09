"""Offline tests for Hinglish mode: the prompt, the voice choice and switching mid-session."""
import unittest
import uuid
from unittest import mock

from tests import offline_env

offline_env.apply()

from app.voice import factory  # noqa: E402
from app.voice.conversation import Conversation  # noqa: E402
from app.voice.fakes import FakeLLM, FakeSTT, FakeTTS  # noqa: E402
from tests.test_tutor_ws import client, collect_until, receive  # noqa: E402


class HinglishPromptTests(unittest.TestCase):
    def test_hinglish_prompt_asks_for_roman_script_and_english_terms(self):
        prompt = Conversation(topic="Stacks", hinglish=True).build_prompt("stack kya hota hai?")
        self.assertIn("Hinglish", prompt)
        self.assertIn("Roman (Latin) script", prompt)
        self.assertIn("Never use Devanagari", prompt)
        self.assertIn("code in English", prompt)

    def test_english_prompt_has_no_hinglish_instruction(self):
        self.assertNotIn("Hinglish", Conversation(topic="Stacks").build_prompt("what is a stack?"))


class HinglishVoiceTests(unittest.TestCase):
    def setUp(self):
        factory.reset()
        self.addCleanup(factory.reset)

    def test_hinglish_uses_the_cloud_voice_even_when_local_is_configured(self):
        local, cloud = FakeTTS(), FakeTTS()
        cloud.name = "cloud-voice"
        with mock.patch.object(factory, "KokoroTTS", lambda: local), mock.patch.object(factory, "EdgeTTS", lambda: cloud):
            self.assertEqual(factory.VOICE_TTS_PROVIDER, "local")
            self.assertIs(factory.get_tts(hinglish=True), cloud)
            english = factory.get_tts(hinglish=False)
            english.synthesize("hello there")
            self.assertEqual(local.spoken, ["hello there"])
            self.assertEqual(cloud.spoken, [])


class HinglishSessionTests(unittest.TestCase):
    def setUp(self):
        self.llm = FakeLLM()
        self.voices = {False: FakeTTS(), True: FakeTTS()}
        self.voices[True].name = "cloud-voice"
        for target, value in (("get_llm", lambda: self.llm), ("get_stt", lambda: FakeSTT()),
                              ("get_tts", lambda hinglish=False: self.voices[bool(hinglish)])):
            p = mock.patch.object(factory, target, value)
            p.start()
            self.addCleanup(p.stop)
        self.ws = client.websocket_connect("/tutor/ws").__enter__()
        self.addCleanup(lambda: self.ws.__exit__(None, None, None))
        self.ws.send_json({"type": "auth", "token": offline_env.token(f"hin-{uuid.uuid4().hex[:8]}")})
        receive(self.ws)

    def turn(self, text):
        self.ws.send_json({"type": "user_text", "text": text})
        return collect_until(self.ws, "turn_end")[0]

    def test_session_started_in_hinglish_uses_the_hinglish_prompt_and_voice(self):
        self.ws.send_json({"type": "start", "topic": "Stacks", "hinglish": True})
        ready, _ = collect_until(self.ws, "ready")
        self.assertTrue(ready[-1]["hinglish"])
        self.turn("stack kya hota hai?")
        self.assertIn("Hinglish", self.llm.prompts[0])
        self.assertEqual(len(self.voices[True].spoken), 4)
        self.assertEqual(self.voices[False].spoken, [])

    def test_toggle_mid_session_switches_language_and_voice(self):
        self.ws.send_json({"type": "start", "topic": "Stacks"})
        collect_until(self.ws, "ready")
        self.turn("What is a stack?")
        self.assertNotIn("Hinglish", self.llm.prompts[0])
        self.ws.send_json({"type": "set", "hinglish": True})
        events = self.turn("aur queue?")
        self.assertIn("Hinglish", self.llm.prompts[1])
        self.assertEqual(len(self.voices[True].spoken), 4)
        self.assertEqual(len(self.voices[False].spoken), 4)
        providers = [e for e in events if e["type"] == "providers"]
        if providers:
            self.assertEqual(providers[-1]["tts"]["active"], "cloud-voice")


if __name__ == "__main__":
    unittest.main()
