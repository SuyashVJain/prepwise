"""
Offline tests for the voice tutor core: no network, no speech models.

Run from the backend directory:  python -m unittest discover -s tests -v
"""
import asyncio
import unittest

from app.voice.conversation import MAX_TURNS, NOT_IN_DOCUMENTS, REFUSAL_TEXT, SUMMARY_CHARS, Conversation
from app.voice.fakes import FakeLLM, FakeSTT, FakeTTS
from app.voice.pipeline import run_turn
from app.voice.providers import FallbackSTT, FallbackTTS, ProviderError
from app.voice.text import SentenceSplitter, clean_for_speech, split_sentences


class Recorder:
    def __init__(self):
        self.events = []

    async def __call__(self, event, audio):
        self.events.append((event, audio))

    def of(self, kind):
        return [e for e, _ in self.events if e["type"] == kind]


class SentenceSplitterTests(unittest.TestCase):
    def test_splits_complete_sentences(self):
        self.assertEqual(
            split_sentences("A stack is a pile of items. You add to the top! Do you follow?"),
            ["A stack is a pile of items.", "You add to the top!", "Do you follow?"],
        )

    def test_streams_across_fragments(self):
        splitter = SentenceSplitter()
        out = []
        for fragment in ["A queue is first in, ", "first out. Think of a ", "ticket line at a station. Next"]:
            out += splitter.feed(fragment)
        self.assertEqual(out, ["A queue is first in, first out.", "Think of a ticket line at a station."])
        self.assertEqual(splitter.flush(), ["Next"])

    def test_keeps_decimals_and_abbreviations_together(self):
        self.assertEqual(
            split_sentences("Binary search takes about 3.5 steps here, e.g. on eleven items. That is fast."),
            ["Binary search takes about 3.5 steps here, e.g. on eleven items.", "That is fast."],
        )

    def test_short_fragments_join_the_next_sentence(self):
        self.assertEqual(split_sentences("Yes. A list is ordered and mutable."), ["Yes. A list is ordered and mutable."])

    def test_clean_for_speech_removes_markup(self):
        self.assertEqual(
            clean_for_speech("**Stacks** use `push`.\n- last in first out [Source: os.pdf]"),
            "Stacks use push. last in first out",
        )


class ConversationTests(unittest.TestCase):
    def test_history_is_trimmed_to_the_window(self):
        c = Conversation()
        for i in range(30):
            c.add("student" if i % 2 == 0 else "tutor", f"message number {i}")
        self.assertEqual(len(c.history), MAX_TURNS)
        self.assertEqual(c.history[-1].text, "message number 29")
        self.assertEqual(c.history[0].text, f"message number {30 - MAX_TURNS}")

    def test_trimmed_turns_go_into_a_bounded_summary(self):
        c = Conversation()
        for i in range(200):
            c.add("student" if i % 2 == 0 else "tutor", f"turn {i} " + "word " * 40)
        self.assertIn("Tutor covered", c.summary)
        self.assertLessEqual(len(c.summary), SUMMARY_CHARS + 3)
        self.assertNotIn("turn 199", c.summary)

    def test_prompt_contains_summary_recent_turns_and_new_message(self):
        c = Conversation(subject="DSA", topic="Stacks")
        for i in range(12):
            c.add("student" if i % 2 == 0 else "tutor", f"point {i}")
        prompt = c.build_prompt("what about queues?")
        self.assertIn("Current topic: Stacks", prompt)
        self.assertIn("EARLIER IN THIS SESSION", prompt)
        self.assertIn("point 11", prompt)
        self.assertNotIn("Student: point 0\n", prompt)
        self.assertTrue(prompt.rstrip().endswith("Student: what about queues?\nAria:"))
        self.assertEqual(len(c.history), MAX_TURNS, "building a prompt must not change history")

    def test_documents_mode_restricts_to_excerpts(self):
        c = Conversation(mode="documents")
        prompt = c.build_prompt("what is paging?", [{"text": "Paging divides memory into fixed frames."}])
        self.assertIn("Answer ONLY from the syllabus excerpts", prompt)
        self.assertIn("[1] Paging divides memory", prompt)
        self.assertIn(NOT_IN_DOCUMENTS, prompt)
        self.assertNotIn("SYLLABUS EXCERPTS", Conversation().build_prompt("hi"))

    def test_empty_messages_are_ignored(self):
        c = Conversation()
        c.add("student", "   ")
        self.assertEqual(c.history, [])


class FallbackTests(unittest.TestCase):
    def test_falls_back_when_the_preferred_provider_cannot_load(self):
        def broken():
            raise ProviderError("model missing")

        stt = FallbackSTT(broken, lambda: FakeSTT("hello"))
        self.assertEqual(stt.transcribe(b"x"), "hello")
        self.assertTrue(stt.fell_back)
        self.assertEqual(stt.name, "fake-stt")
        self.assertIn("model missing", stt.reason)

    def test_falls_back_when_the_preferred_provider_raises_mid_call(self):
        primary, backup = FakeTTS(fail=True), FakeTTS()
        tts = FallbackTTS(lambda: primary, lambda: backup)
        self.assertFalse(tts.fell_back)
        self.assertTrue(tts.synthesize("hello there").startswith(b"RIFF"))
        self.assertTrue(tts.fell_back)
        tts.synthesize("again")
        self.assertEqual(backup.spoken, ["hello there", "again"])

    def test_no_fallback_when_the_preferred_provider_works(self):
        stt = FallbackSTT(lambda: FakeSTT("fine"), lambda: FakeSTT("backup"))
        self.assertEqual(stt.transcribe(b"x"), "fine")
        self.assertFalse(stt.fell_back)

    def test_error_when_both_providers_fail(self):
        tts = FallbackTTS(lambda: FakeTTS(fail=True), lambda: FakeTTS(fail=True))
        with self.assertRaises(ProviderError):
            tts.synthesize("hello")


class PipelineTests(unittest.IsolatedAsyncioTestCase):
    async def test_sentences_and_audio_arrive_in_order(self):
        rec, tts = Recorder(), FakeTTS()
        result = await run_turn("p", FakeLLM(), tts, rec, asyncio.Event())
        sentences = [e["text"] for e in rec.of("sentence")]
        self.assertEqual(len(sentences), 4)
        self.assertEqual([e["seq"] for e in rec.of("sentence")], [1, 2, 3, 4])
        self.assertEqual([e["seq"] for e in rec.of("audio")], [1, 2, 3, 4])
        self.assertEqual(tts.spoken, sentences)
        self.assertEqual(result.text, " ".join(sentences))
        self.assertFalse(result.cancelled)
        self.assertIsNotNone(result.first_audio_ms)

    async def test_first_sentence_is_sent_before_the_reply_finishes(self):
        rec = Recorder()
        order = []

        class SlowLLM(FakeLLM):
            def stream(self, prompt, max_tokens=500, temperature=0.6):
                for fragment in super().stream(prompt, max_tokens, temperature):
                    yield fragment
                order.append("llm_done")

        async def emit(event, audio):
            if event["type"] == "sentence" and event["seq"] == 1:
                order.append("first_sentence")
            await rec(event, audio)

        await run_turn("p", SlowLLM(delay=0.01), FakeTTS(), emit, asyncio.Event())
        self.assertEqual(order, ["first_sentence", "llm_done"])

    async def test_cancel_stops_the_turn_early(self):
        rec, cancel = Recorder(), asyncio.Event()

        async def emit(event, audio):
            await rec(event, audio)
            if event["type"] == "sentence" and event["seq"] == 1:
                cancel.set()

        tts = FakeTTS(delay=0.05)
        result = await run_turn("p", FakeLLM(delay=0.02), tts, emit, cancel)
        self.assertTrue(result.cancelled)
        self.assertLess(len(result.sentences), 4)
        self.assertEqual(rec.of("audio"), [], "no audio may be sent after a cancel")

    async def test_cancel_during_speech_stops_remaining_audio(self):
        rec, cancel = Recorder(), asyncio.Event()

        async def emit(event, audio):
            await rec(event, audio)
            if event["type"] == "audio":
                cancel.set()

        result = await run_turn("p", FakeLLM(), FakeTTS(delay=0.03), emit, cancel)
        self.assertTrue(result.cancelled)
        self.assertEqual(len(rec.of("audio")), 1)

    async def test_refusal_sentinel_is_replaced_by_a_polite_refusal(self):
        rec = Recorder()
        result = await run_turn(
            "p", FakeLLM(reply=NOT_IN_DOCUMENTS), FakeTTS(), rec, asyncio.Event(),
            refusal_sentinel=NOT_IN_DOCUMENTS, refusal_text=REFUSAL_TEXT,
        )
        self.assertTrue(result.refused)
        self.assertNotIn(NOT_IN_DOCUMENTS, result.text)
        self.assertIn("could not find that in your documents", result.text)

    async def test_normal_reply_passes_the_sentinel_check_intact(self):
        rec = Recorder()
        result = await run_turn(
            "p", FakeLLM(reply="Normalisation removes redundancy. It uses normal forms."), FakeTTS(), rec, asyncio.Event(),
            refusal_sentinel=NOT_IN_DOCUMENTS, refusal_text=REFUSAL_TEXT,
        )
        self.assertFalse(result.refused)
        self.assertEqual(result.text, "Normalisation removes redundancy. It uses normal forms.")

    async def test_text_continues_when_the_voice_fails(self):
        rec = Recorder()
        result = await run_turn("p", FakeLLM(), FakeTTS(fail=True), rec, asyncio.Event())
        self.assertEqual(len(rec.of("sentence")), 4)
        self.assertEqual(rec.of("audio"), [])
        self.assertEqual(len(rec.of("error")), 1)
        self.assertTrue(result.tts_error)

    async def test_falls_back_to_a_full_reply_when_streaming_is_unavailable(self):
        rec = Recorder()
        result = await run_turn("p", FakeLLM(stream_fails=True), FakeTTS(), rec, asyncio.Event())
        self.assertEqual(len(result.sentences), 4)

    async def test_llm_failure_is_raised(self):
        with self.assertRaises(ProviderError):
            await run_turn("p", FakeLLM(fail=True), FakeTTS(), Recorder(), asyncio.Event())

    async def test_text_only_turn_without_a_voice(self):
        rec = Recorder()
        result = await run_turn("p", FakeLLM(), None, rec, asyncio.Event())
        self.assertEqual(len(result.sentences), 4)
        self.assertEqual(rec.of("audio"), [])


if __name__ == "__main__":
    unittest.main()
