"""Offline tests for Doubt Mode: the trigger phrases, the conversation state and the session wiring."""
import unittest
import uuid
from unittest import mock

from tests import offline_env

offline_env.apply()

from app.voice import factory  # noqa: E402
from app.voice.conversation import DOUBT_STYLES, Conversation, is_doubt_trigger  # noqa: E402
from app.voice.fakes import FakeLLM, FakeSTT, FakeTTS  # noqa: E402
from tests.test_tutor_ws import client, collect_until, of, receive  # noqa: E402


class DoubtTriggerTests(unittest.TestCase):
    def test_short_interruptions_are_triggers(self):
        for text in ["wait", "Wait.", "wait wait", "Wait, what?", "I did not get that", "I didn't get that.", "sorry, I don't understand",
                     "can you explain that again", "say that again please", "samajh nahi aaya", "one more time"]:
            self.assertTrue(is_doubt_trigger(text), text)

    def test_real_questions_are_not_triggers(self):
        for text in ["", "what is a stack", "wait time in round robin scheduling is high", "I did not get that part about how push changes the top pointer in an array",
                     "explain binary search", "what does the wait system call do", "okay", "yes"]:
            self.assertFalse(is_doubt_trigger(text), text)


class DoubtStateTests(unittest.TestCase):
    def test_styles_cycle_simpler_analogy_example(self):
        c = Conversation()
        c.note_reply("A stack is last in, first out.")
        names = [c.next_doubt_style()[0] for _ in range(4)]
        self.assertEqual(names, ["simpler", "analogy", "example", "simpler"])
        self.assertEqual(c.doubt_count, 4)
        self.assertEqual([s[0] for s in DOUBT_STYLES], ["simpler", "analogy", "example"])

    def test_re_explanation_keeps_the_original_point(self):
        c = Conversation()
        c.note_reply("A stack is last in, first out.")
        c.next_doubt_style()
        c.note_reply("Think of a pile of plates.", was_doubt=True)
        self.assertEqual(c.last_point, "A stack is last in, first out.")
        self.assertEqual(c.doubt_count, 1)

    def test_a_new_explanation_resets_the_doubt_count(self):
        c = Conversation()
        c.note_reply("A stack is last in, first out.")
        c.next_doubt_style()
        c.next_doubt_style()
        c.note_reply("A queue is first in, first out.")
        self.assertEqual(c.last_point, "A queue is first in, first out.")
        self.assertEqual(c.doubt_count, 0)
        self.assertEqual(c.next_doubt_style()[0], "simpler")

    def test_doubt_prompt_quotes_the_point_and_the_style(self):
        c = Conversation(topic="Stacks")
        c.add("student", "What is a stack?")
        c.note_reply("A stack is last in, first out.")
        _, instruction = c.next_doubt_style()
        prompt = c.build_doubt_prompt(instruction, "wait")
        self.assertIn('"A stack is last in, first out."', prompt)
        self.assertIn("simpler, everyday words", prompt)
        self.assertIn("Student: wait", prompt)
        self.assertIn("do not move on to a new idea", prompt)


class DoubtSessionTests(unittest.TestCase):
    def setUp(self):
        self.llm, self.tts = FakeLLM(), FakeTTS()
        for target, value in (("get_llm", lambda: self.llm), ("get_stt", lambda: FakeSTT()), ("get_tts", lambda hinglish=False: self.tts)):
            p = mock.patch.object(factory, target, value)
            p.start()
            self.addCleanup(p.stop)
        self.ws = client.websocket_connect("/tutor/ws").__enter__()
        self.addCleanup(lambda: self.ws.__exit__(None, None, None))
        self.ws.send_json({"type": "auth", "token": offline_env.token(f"doubt-{uuid.uuid4().hex[:8]}")})
        receive(self.ws)
        self.ws.send_json({"type": "start", "topic": "Stacks", "speak": False})
        collect_until(self.ws, "ready")

    def ask(self, message):
        self.ws.send_json(message)
        return collect_until(self.ws, "turn_end")[0]

    def test_button_re_explains_the_last_point_in_a_new_style_each_time(self):
        self.ask({"type": "user_text", "text": "What is a stack?"})
        first = self.ask({"type": "doubt"})
        second = self.ask({"type": "doubt"})
        self.assertEqual([of(e, "doubt")[0]["style"] for e in (first, second)], ["simpler", "analogy"])
        self.assertEqual(of(first, "transcript")[0]["text"], "I did not get that.")
        self.assertIn("A stack is a pile where you add and remove from the top only.", self.llm.prompts[1])
        self.assertIn("simpler, everyday words", self.llm.prompts[1])
        self.assertIn("analogy", self.llm.prompts[2])

    def test_spoken_trigger_is_treated_as_a_doubt(self):
        self.ask({"type": "user_text", "text": "What is a stack?"})
        events = self.ask({"type": "user_text", "text": "Wait, I didn't get that"})
        self.assertEqual(of(events, "doubt")[0]["style"], "simpler")
        self.assertIn("Explain that same point again, differently", self.llm.prompts[1])

    def test_a_normal_question_after_a_doubt_starts_fresh(self):
        self.ask({"type": "user_text", "text": "What is a stack?"})
        self.ask({"type": "doubt"})
        events = self.ask({"type": "user_text", "text": "And what is a queue?"})
        self.assertEqual(of(events, "doubt"), [])
        self.assertEqual(of(self.ask({"type": "doubt"}), "doubt")[0]["style"], "simpler")

    def test_doubt_before_anything_was_explained_uses_no_model_call(self):
        events = self.ask({"type": "doubt"})
        self.assertIn("nothing to go over again", of(events, "sentence")[0]["text"])
        self.assertEqual(self.llm.prompts, [])

    def test_trigger_word_with_nothing_explained_is_a_normal_message(self):
        events = self.ask({"type": "user_text", "text": "wait"})
        self.assertEqual(of(events, "doubt"), [])
        self.assertEqual(len(self.llm.prompts), 1)


if __name__ == "__main__":
    unittest.main()
