"""Very short, empty and restated answers are capped without a model call."""
import asyncio
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from app.services import gemini  # noqa: E402
from app.services.scorer import evaluate_answer  # noqa: E402

QUESTION = "Explain how a stack works and when you would use one in a program."
REAL = (
    "A stack is a last in first out structure where you push items on top and pop them off the top, "
    "which suits undo history, function call tracking and checking balanced brackets in an expression."
)


def score(answer, question=QUESTION):
    with mock.patch.object(gemini, "verify_claims", side_effect=AssertionError("model must not be called")), \
         mock.patch.object(gemini, "score_single_prompt", side_effect=AssertionError("model must not be called")):
        return asyncio.run(evaluate_answer(question, answer, "Data Structures", ["LIFO"], "LIFO structure"))


class TrivialAnswerTests(unittest.TestCase):
    def test_empty_and_blank_answers(self):
        for answer in ("", "   ", None):
            r = score(answer)
            self.assertEqual(r["score"], 0.0)
            self.assertEqual(r["hint"], gemini.TRIVIAL_ANSWER_HINT)
            self.assertEqual(r["claims"], [])

    def test_a_few_characters_is_no_attempt_and_scores_zero(self):
        self.assertEqual(score("idk")["score"], 0.0)

    def test_very_short_answer_is_capped_at_one(self):
        r = score("A stack is LIFO and you push and pop items.")
        self.assertEqual(r["score"], 1.0)
        self.assertEqual(r["hint"], "Too short to score properly. Try a longer answer.")
        self.assertEqual(r["claims"], [])
        self.assertEqual(r["weak_areas"], ["Data Structures"])
        self.assertEqual(r["ideal_answer"], "LIFO structure")

    def test_fourteen_words_is_short_and_fifteen_is_not(self):
        self.assertTrue(gemini.is_trivial_answer(QUESTION, " ".join(["word%d" % i for i in range(14)])))
        self.assertFalse(gemini.is_trivial_answer(QUESTION, " ".join(["word%d" % i for i in range(15)])))

    def test_question_restated_back_is_capped(self):
        restated = "You want me to explain how a stack works and when I would use one in a program"
        self.assertEqual(score(restated)["score"], 1.0)
        # Long enough to pass the word count, but still only the question's own words.
        long_restatement = (QUESTION + " ") * 2
        self.assertTrue(gemini.is_trivial_answer(QUESTION, long_restatement))
        self.assertEqual(score(long_restatement)["score"], 1.0)

    def test_a_real_answer_reaches_the_model(self):
        self.assertFalse(gemini.is_trivial_answer(QUESTION, REAL))
        claims = [{"claim": "A stack is last in first out", "verdict": "correct", "confidence": 0.9}]
        with mock.patch.object(gemini, "verify_claims", return_value=claims) as verify, \
             mock.patch.object(gemini, "score_from_claims", return_value={"score": 8.0, "hint": "Good.", "ideal_answer": "x", "weak_areas": []}):
            result = asyncio.run(evaluate_answer(QUESTION, REAL, "Data Structures", ["LIFO"], "LIFO"))
        verify.assert_called_once()
        self.assertEqual(result["score"], 8.0)

    def test_an_answer_that_borrows_a_few_question_words_is_not_a_restatement(self):
        answer = "A stack works by letting you push and pop items from one end only, so the last one in is the first one out."
        self.assertFalse(gemini.is_trivial_answer(QUESTION, answer))


if __name__ == "__main__":
    unittest.main()
