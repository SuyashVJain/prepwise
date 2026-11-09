"""A preset topic (sent alone, with no syllabus chunks) keeps the interview on that topic."""
import unittest

from tests import offline_env

offline_env.apply()

from app.services.rag import build_rag, select_topic_for_question  # noqa: E402


class PresetTopicTests(unittest.TestCase):
    def test_single_topic_is_used_for_every_question(self):
        rag = build_rag(topics=["Binary search"], raw_chunks=[], chunks_metadata=[], university="X", semester=5, user_id="bridge-user")
        topics = rag.get_all_topics()
        self.assertEqual(topics, ["Binary search"])
        asked = []
        for _ in range(5):
            topic = select_topic_for_question(topics, asked, "technical")
            self.assertEqual(topic, "Binary search")
            asked.append(topic)
        self.assertTrue(all("Binary search" in c["text"] for c in rag.retrieve("interview question about Binary search", k=3)))


if __name__ == "__main__":
    unittest.main()
