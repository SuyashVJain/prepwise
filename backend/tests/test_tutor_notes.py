"""Offline tests for session notes: prompt size, reply clean-up and the route."""
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import tutor  # noqa: E402
from app.voice.notes import MAX_CARDS, NotEnoughToSummarise, build_notes_prompt, make_notes  # noqa: E402

TRANSCRIPT = [
    {"role": "student", "text": "What is a stack?"},
    {"role": "tutor", "text": "A stack is last in, first out. You push to the top and pop from the top."},
    {"role": "student", "text": "Where is it used?"},
    {"role": "tutor", "text": "Function calls use a call stack, and undo in an editor is a stack too."},
]
REPLY = {
    "summary": "A stack is last in, first out. It is used for function calls and undo.",
    "flashcards": [{"front": f"Question {i}?", "back": f"Answer {i}."} for i in range(10)] + [{"front": "", "back": "x"}, "junk"],
}


class Capture:
    def __init__(self, reply):
        self.reply, self.calls = reply, []

    def __call__(self, prompt, **kwargs):
        self.calls.append((prompt, kwargs))
        return self.reply


class NotesTests(unittest.TestCase):
    def test_one_call_returns_summary_and_capped_valid_cards(self):
        llm = Capture(REPLY)
        notes = make_notes(TRANSCRIPT, "DSA", "Stacks", llm_json=llm)
        self.assertEqual(len(llm.calls), 1)
        self.assertEqual(notes["summary"], REPLY["summary"])
        self.assertEqual(len(notes["flashcards"]), MAX_CARDS)
        self.assertEqual(notes["flashcards"][0], {"front": "Question 0?", "back": "Answer 0."})

    def test_prompt_contains_the_transcript_and_topic(self):
        prompt = build_notes_prompt(TRANSCRIPT, "DSA", "Stacks")
        self.assertIn('session on "Stacks"', prompt)
        self.assertIn("Student: What is a stack?", prompt)
        self.assertIn("Aria: A stack is last in, first out.", prompt)
        self.assertIn("5 to 8 cards", prompt)

    def test_long_sessions_are_clipped(self):
        long = [{"role": "tutor" if i % 2 else "student", "text": f"m{i} " + "x" * 2000} for i in range(200)]
        llm = Capture(REPLY)
        make_notes(long, llm_json=llm)
        prompt = llm.calls[0][0]
        self.assertLess(len(prompt), 20000)
        self.assertIn("m199", prompt)
        self.assertNotIn("m100 ", prompt)

    def test_too_short_a_session_makes_no_call(self):
        llm = Capture(REPLY)
        for transcript in ([], [{"role": "student", "text": "hi"}], [{"role": "student", "text": "a"}, {"role": "student", "text": "b"}]):
            with self.assertRaises(NotEnoughToSummarise):
                make_notes(transcript, llm_json=llm)
        self.assertEqual(llm.calls, [])

    def test_empty_reply_is_an_error(self):
        with self.assertRaises(ValueError):
            make_notes(TRANSCRIPT, llm_json=Capture({"summary": "", "flashcards": []}))


class NotesRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"Authorization": f"Bearer {offline_env.token('notes-user')}"}
        self.body = {"subject": "DSA", "topic": "Stacks", "transcript": TRANSCRIPT}

    def test_needs_a_token(self):
        self.assertEqual(self.client.post("/tutor/notes", json=self.body).status_code, 401)

    def test_returns_notes(self):
        with mock.patch.object(tutor, "make_notes", lambda transcript, subject, topic: {"summary": "s", "flashcards": [{"front": "f", "back": "b"}]}):
            res = self.client.post("/tutor/notes", json=self.body, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"summary": "s", "flashcards": [{"front": "f", "back": "b"}]})

    def test_short_session_is_a_400(self):
        res = self.client.post("/tutor/notes", json={**self.body, "transcript": []}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_without_an_llm_key_the_route_reports_503(self):
        res = self.client.post("/tutor/notes", json=self.body, headers=self.headers)
        self.assertEqual(res.status_code, 503)
        self.assertIn("GROQ_API_KEY", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
