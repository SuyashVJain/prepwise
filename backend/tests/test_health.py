"""The health route and the comma-separated CORS origins."""
import unittest

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app, allowed_origins  # noqa: E402


class HealthTests(unittest.TestCase):
    def test_health_is_open_and_small(self):
        res = TestClient(app).get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})

    def test_local_origin_is_always_allowed(self):
        self.assertIn("http://localhost:3000", allowed_origins)


if __name__ == "__main__":
    unittest.main()
