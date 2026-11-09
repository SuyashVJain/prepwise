"""Offline tests for the Python code-along check. Student code must never be executed."""
import os
import tempfile
import unittest

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.voice.code_review import MAX_CODE_CHARS, check_syntax, review_code  # noqa: E402

EXERCISE = "Write a function total(numbers) that returns the sum of a list."
GOOD = "def total(numbers):\n    result = 0\n    for n in numbers:\n        result += n\n    return result\n"


class Capture:
    def __init__(self, reply):
        self.reply, self.calls = reply, []

    def __call__(self, prompt, **kwargs):
        self.calls.append(prompt)
        return self.reply


class CodeReviewTests(unittest.TestCase):
    def test_syntax_error_is_reported_without_a_model_call(self):
        llm = Capture({})
        out = review_code(EXERCISE, "def total(numbers)\n    return sum(numbers)\n", llm_json=llm)
        self.assertEqual(out["verdict"], "syntax_error")
        self.assertEqual(out["line"], 1)
        self.assertFalse(out["executed"])
        self.assertEqual(llm.calls, [])

    def test_valid_code_is_reviewed_by_the_model(self):
        llm = Capture({"verdict": "correct", "feedback": "It adds each number.", "hints": ["Try sum()."]})
        out = review_code(EXERCISE, GOOD, llm_json=llm)
        self.assertEqual(out, {"verdict": "correct", "feedback": "It adds each number.", "hints": ["Try sum()."], "executed": False})
        self.assertIn(EXERCISE, llm.calls[0])
        self.assertIn("result += n", llm.calls[0])
        self.assertIn("has NOT been run", llm.calls[0])

    def test_unknown_verdict_is_not_treated_as_correct(self):
        out = review_code(EXERCISE, GOOD, llm_json=Capture({"verdict": "PERFECT!!", "feedback": "ok", "hints": "x"}))
        self.assertEqual(out["verdict"], "needs_work")

    def test_empty_code_needs_no_model_call(self):
        llm = Capture({})
        self.assertEqual(review_code(EXERCISE, "   \n", llm_json=llm)["verdict"], "needs_work")
        self.assertEqual(llm.calls, [])

    def test_code_is_never_executed(self):
        marker = os.path.join(tempfile.gettempdir(), "prepwise_must_not_exist.txt")
        if os.path.exists(marker):
            os.remove(marker)
        hostile = f"import os\nopen({marker!r}, 'w').write('ran')\nos.system('echo ran')\nraise SystemExit(1)\n"
        self.assertIsNone(check_syntax(hostile))
        review_code(EXERCISE, hostile, llm_json=Capture({"verdict": "needs_work", "feedback": "f", "hints": []}))
        self.assertFalse(os.path.exists(marker), "student code was executed")

    def test_long_code_is_cut_before_review(self):
        llm = Capture({"verdict": "needs_work", "feedback": "f", "hints": []})
        # Four characters a line, so the cut lands on a line end and the code stays valid.
        review_code(EXERCISE, "x=1\n" * 5000, llm_json=llm)
        self.assertLess(len(llm.calls[0]), MAX_CODE_CHARS + 2000)

    def test_deeply_nested_input_does_not_crash(self):
        self.assertIsNotNone(check_syntax("(" * 3000))


class CodeRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"Authorization": f"Bearer {offline_env.token('code-user')}"}

    def test_needs_a_token(self):
        self.assertEqual(self.client.post("/tutor/code-check", json={"exercise": EXERCISE, "code": GOOD}).status_code, 401)

    def test_syntax_errors_work_without_an_llm_key(self):
        res = self.client.post("/tutor/code-check", json={"exercise": EXERCISE, "code": "print('hi'"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["verdict"], "syntax_error")
        self.assertFalse(res.json()["executed"])

    def test_valid_code_without_an_llm_key_reports_503(self):
        res = self.client.post("/tutor/code-check", json={"exercise": EXERCISE, "code": GOOD}, headers=self.headers)
        self.assertEqual(res.status_code, 503)


if __name__ == "__main__":
    unittest.main()
