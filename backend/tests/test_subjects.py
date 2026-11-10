"""The shared subject list: shape, the five original ids, and the frontend copy staying identical."""
import json
import unittest
from pathlib import Path

from tests import offline_env

offline_env.apply()

from app.services.rag import SUBJECTS, CS_SUBJECTS  # noqa: E402

FRONTEND_COPY = Path(__file__).resolve().parents[2] / "frontend" / "data" / "subjects.json"


class SubjectListTests(unittest.TestCase):
    def test_original_ids_are_kept(self):
        ids = [s["id"] for s in SUBJECTS]
        for old in ("python", "dsa", "dbms", "os", "cn"):
            self.assertIn(old, ids)

    def test_required_subjects_exist(self):
        names = {s["name"] for s in SUBJECTS}
        for name in ("Python", "DSA", "DBMS", "Operating Systems", "Computer Networks", "OOP", "System Design",
                     "Theory of Computation", "Compilers", "Machine Learning", "Software Engineering"):
            self.assertIn(name, names)

    def test_ids_and_names_are_unique_and_topics_present(self):
        self.assertEqual(len({s["id"] for s in SUBJECTS}), len(SUBJECTS))
        self.assertEqual(len(set(CS_SUBJECTS)), len(CS_SUBJECTS))
        for s in SUBJECTS:
            self.assertTrue(s["topics"], s["id"])

    @unittest.skipUnless(FRONTEND_COPY.exists(), "frontend copy not present in this checkout")
    def test_frontend_copy_is_identical(self):
        self.assertEqual(json.loads(FRONTEND_COPY.read_text(encoding="utf-8")), SUBJECTS)


if __name__ == "__main__":
    unittest.main()
