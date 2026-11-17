"""The server voice order (VOICE_TTS_ORDER) and the Hinglish routing. Fake engines, no network, no models."""
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from app.voice import factory  # noqa: E402
from app.voice.providers import ProviderError  # noqa: E402
from tests.test_groq_tts import builder  # noqa: E402


class OrderParsingTests(unittest.TestCase):
    def test_default_without_the_variable(self):
        self.assertEqual(factory.tts_order("", "cloud"), ["groq"])
        self.assertEqual(factory.tts_order("", "local"), ["kokoro", "groq"])

    def test_the_variable_sets_the_order_and_browser_ends_the_list(self):
        self.assertEqual(factory.tts_order("groq,kokoro,browser", "cloud"), ["groq", "kokoro"])
        self.assertEqual(factory.tts_order("kokoro, groq ,edge", "cloud"), ["kokoro", "groq", "edge"])
        self.assertEqual(factory.tts_order("groq,browser,kokoro", "local"), ["groq"], "nothing counts after browser")
        self.assertEqual(factory.tts_order("browser", "local"), [])

    def test_case_duplicates_and_unknown_names(self):
        self.assertEqual(factory.tts_order("GROQ,groq,Kokoro,bogus,", "cloud"), ["groq", "kokoro"])

    def test_an_explicit_order_wins_over_the_provider_setting(self):
        self.assertEqual(factory.tts_order("groq", "local"), ["groq"])
        self.assertEqual(factory.tts_order("kokoro,groq", "cloud"), ["kokoro", "groq"])


class RoutingTests(unittest.TestCase):
    def setUp(self):
        factory.reset()
        self.addCleanup(factory.reset)
        self.events = []

    def setup_engines(self, order, provider="cloud", fail=()):
        e = self.events
        for name, attr in (("kokoro", "KokoroTTS"), ("groq", "GroqTTS"), ("edge", "EdgeTTS")):
            patcher = mock.patch.object(factory, attr, builder(name, e, fail_to_build=name in fail))
            patcher.start()
            self.addCleanup(patcher.stop)
        for attr, value in (("VOICE_TTS_PROVIDER", provider), ("VOICE_TTS_ORDER", order)):
            patcher = mock.patch.object(factory, attr, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_kokoro_is_never_built_unless_it_is_in_the_order(self):
        self.setup_engines("groq,browser")
        factory.get_tts().synthesize("hello there friend")
        self.assertEqual(self.events, ["groq:build", "groq:synthesize"])

    def test_the_default_cloud_setup_is_groq_only(self):
        self.setup_engines("", "cloud")
        factory.get_tts().synthesize("hello there friend")
        self.assertEqual(self.events, ["groq:build", "groq:synthesize"])

    def test_the_order_is_followed(self):
        self.setup_engines("groq,kokoro,browser", fail=("groq",))
        factory.get_tts().synthesize("hello there friend")
        self.assertEqual(self.events, ["groq:build", "kokoro:build", "kokoro:synthesize"])

    def test_edge_is_only_used_when_it_is_listed(self):
        self.setup_engines("groq,browser", fail=("groq",))
        with self.assertRaises(ProviderError):
            factory.get_tts().synthesize("hello there friend")
        self.assertNotIn("edge:build", self.events)

    def test_hinglish_uses_kokoro_when_enabled(self):
        self.setup_engines("groq,kokoro,browser")
        factory.get_tts(hinglish=True).synthesize("namaste dost")
        self.assertEqual(self.events, ["kokoro:build", "kokoro:synthesize"])

    def test_hinglish_uses_the_browser_voice_when_kokoro_is_not_enabled(self):
        self.setup_engines("groq,edge,browser")
        with self.assertRaises(ProviderError) as ctx:
            factory.get_tts(hinglish=True).synthesize("namaste dost")
        self.assertIn("browser voice", str(ctx.exception))
        self.assertEqual(self.events, [], "no engine was built for Hinglish")

    def test_no_engines_means_the_browser_voice_for_everything(self):
        self.setup_engines("browser")
        with self.assertRaises(ProviderError):
            factory.get_tts().synthesize("hello there friend")
        self.assertEqual(self.events, [])

    def test_a_kokoro_hinglish_failure_goes_to_the_browser_voice_not_to_an_english_voice(self):
        self.setup_engines("kokoro,groq,browser", fail=("kokoro",))
        with self.assertRaises(ProviderError):
            factory.get_tts(hinglish=True).synthesize("namaste dost")
        self.assertEqual(self.events, ["kokoro:build"])


if __name__ == "__main__":
    unittest.main()
