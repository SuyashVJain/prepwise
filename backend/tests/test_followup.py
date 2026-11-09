"""Offline checks for the follow-up decision and for how the follow-up reaches the question prompt."""
import asyncio
import json
import unittest

from tests import offline_env

offline_env.apply()

from app.services import gemini  # noqa: E402
from app.services.followup import decide_follow_up  # noqa: E402

BAD = [{"claim": "TCP has no acks", "verdict": "incorrect", "critical": False}]
CRIT = [{"claim": "UDP is reliable", "verdict": "incorrect", "critical": True}, *BAD]
VAGUE = [{"claim": "it depends", "verdict": "unverifiable"}]
GOOD = [{"claim": "SYN starts it", "verdict": "correct"}]


class FollowUpDecisionTests(unittest.TestCase):
    def decide(self, score=8.0, claims=GOOD, weak=(), last_fu=False, so_far=0, total=10):
        return decide_follow_up(score, list(claims), list(weak), last_fu, so_far, total)

    def test_good_answer_moves_on(self):
        self.assertIsNone(self.decide())

    def test_incorrect_claim_is_probed(self):
        self.assertEqual(self.decide(claims=BAD), "TCP has no acks")

    def test_critical_error_is_probed_first(self):
        self.assertEqual(self.decide(claims=CRIT), "UDP is reliable")

    def test_unverifiable_claim_is_probed(self):
        self.assertEqual(self.decide(claims=VAGUE), "it depends")

    def test_low_score_without_claims_uses_weak_area(self):
        self.assertEqual(self.decide(score=3.0, claims=[], weak=["handshake"]), "handshake")
        self.assertIsNotNone(self.decide(score=3.0, claims=[]))

    def test_no_second_follow_up_for_one_base_question(self):
        self.assertIsNone(self.decide(claims=BAD, last_fu=True))

    def test_capped_at_a_third_of_the_session(self):
        self.assertIsNotNone(self.decide(claims=BAD, so_far=2, total=10))
        self.assertIsNone(self.decide(claims=BAD, so_far=3, total=10))
        self.assertIsNone(self.decide(claims=BAD, so_far=0, total=2))  # too short a session for any


class FollowUpPromptTests(unittest.TestCase):
    def ask(self, follow_up):
        prompts = []
        original = gemini.call_llm
        gemini.call_llm = lambda prompt, **kw: prompts.append(prompt) or json.dumps({"question": "q"})
        try:
            asyncio.run(gemini.generate_question("TCP", "technical", "faang", follow_up=follow_up))
        finally:
            gemini.call_llm = original
        return prompts

    def test_follow_up_uses_the_same_single_call(self):
        prompts = self.ask({"question": "Explain TCP", "focus": "TCP has no acks"})
        self.assertEqual(len(prompts), 1)
        self.assertIn("FOLLOW-UP", prompts[0])
        self.assertIn("TCP has no acks", prompts[0])

    def test_normal_question_has_no_follow_up_text(self):
        self.assertNotIn("FOLLOW-UP", self.ask(None)[0])


if __name__ == "__main__":
    unittest.main()
