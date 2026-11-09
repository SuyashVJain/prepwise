"""The public demo route: validation, per-IP limit, global cap, no sign-in and no database."""
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.limits import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import demo  # noqa: E402

GOOD = "Dijkstra picks the unvisited vertex with the smallest distance and relaxes its edges."


async def fake_evaluate(**kwargs):
    return {"score": 7.0, "feedback": "ok", "claims": []}


class DemoTests(unittest.TestCase):
    def setUp(self):
        limiter.reset()
        demo.reset_global_counters()
        self.client = TestClient(app)
        patcher = mock.patch.object(demo, "evaluate_answer", fake_evaluate)
        patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, body, ip="1.1.1.1"):
        return self.client.post("/demo/check", json=body, headers={"x-forwarded-for": ip})

    def test_needs_no_sign_in(self):
        res = self.post({"question_id": "dijkstra", "answer": GOOD})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["score"], 7.0)

    def test_rejects_bad_input(self):
        self.assertEqual(self.post({"question_id": "nope", "answer": GOOD}).status_code, 422)
        self.assertEqual(self.post({"question_id": "dijkstra", "answer": "short"}).status_code, 422)
        self.assertEqual(self.post({"question_id": "dijkstra", "answer": "x" * 601}).status_code, 422)
        self.assertEqual(self.post({"question_id": "dijkstra"}).status_code, 422)
        self.assertEqual(self.post({"question_id": 5, "answer": GOOD}).status_code, 422)

    def test_per_ip_limit_is_friendly(self):
        for _ in range(3):
            self.assertEqual(self.post({"question_id": "dijkstra", "answer": GOOD}).status_code, 200)
        res = self.post({"question_id": "dijkstra", "answer": GOOD})
        self.assertEqual(res.status_code, 429)
        self.assertTrue(res.json()["limited"])
        self.assertIn("sign up", res.json()["message"])
        # another visitor is not affected
        self.assertEqual(self.post({"question_id": "dijkstra", "answer": GOOD}, ip="2.2.2.2").status_code, 200)

    def test_global_daily_cap(self):
        with mock.patch.object(demo, "GLOBAL_DAILY_CAP", 2), mock.patch.object(demo, "GLOBAL_PER_MINUTE_CAP", 99):
            self.assertEqual(self.post({"question_id": "dijkstra", "answer": GOOD}, ip="3.3.3.3").status_code, 200)
            self.assertEqual(self.post({"question_id": "dijkstra", "answer": GOOD}, ip="4.4.4.4").status_code, 200)
            res = self.post({"question_id": "dijkstra", "answer": GOOD}, ip="5.5.5.5")
        self.assertEqual(res.status_code, 429)
        self.assertTrue(res.json()["limited"])

    def test_model_failure_is_friendly(self):
        async def boom(**kwargs):
            raise RuntimeError("quota")
        with mock.patch.object(demo, "evaluate_answer", boom):
            res = self.post({"question_id": "tcp_udp", "answer": GOOD})
        self.assertEqual(res.status_code, 503)
        self.assertIn("message", res.json())

    def test_no_database_access(self):
        source = open(demo.__file__, encoding="utf-8").read().lower()
        self.assertNotIn("supabase", source)

    def test_question_list_is_public(self):
        res = self.client.get("/demo/questions")
        self.assertEqual([q["id"] for q in res.json()], ["dijkstra", "tcp_udp", "normalisation"])


if __name__ == "__main__":
    unittest.main()
