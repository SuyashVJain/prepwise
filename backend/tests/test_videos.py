"""Offline tests for the video recommendation route and its cache. No network."""
import unittest

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import videos  # noqa: E402
from app.services.videos import QuotaExceeded, search_videos  # noqa: E402

PAYLOAD = {"items": [
    {"id": {"videoId": "aaa111"}, "snippet": {"title": "Stacks explained", "channelTitle": "CS Channel"}},
    {"id": {"videoId": "bbb222"}, "snippet": {"title": "Stack vs queue", "channelTitle": "Algo Hub"}},
    {"id": {"kind": "youtube#channel"}, "snippet": {"title": "not a video"}},
]}


class Fetcher:
    def __init__(self, payload=None, error=None):
        self.payload, self.error, self.calls = payload or PAYLOAD, error, []

    def __call__(self, params):
        self.calls.append(params)
        if self.error:
            raise self.error
        return self.payload


class VideoSearchTests(unittest.TestCase):
    def setUp(self):
        videos.clear_cache()

    def test_maps_results_and_builds_the_query(self):
        fetch = Fetcher()
        out = search_videos("DSA", "Stacks", fetch=fetch, api_key="k")
        self.assertEqual(out["source"], "api")
        self.assertEqual([v["id"] for v in out["videos"]], ["aaa111", "bbb222"])
        self.assertEqual(out["videos"][0]["url"], "https://www.youtube.com/watch?v=aaa111")
        self.assertEqual(out["videos"][0]["channel"], "CS Channel")
        self.assertEqual(fetch.calls[0]["q"], "Stacks DSA tutorial")
        self.assertEqual(fetch.calls[0]["safeSearch"], "strict")

    def test_curated_videos_are_removed(self):
        out = search_videos("DSA", "Stacks", exclude_ids=["aaa111"], fetch=Fetcher(), api_key="k")
        self.assertEqual([v["id"] for v in out["videos"]], ["bbb222"])

    def test_results_are_cached_for_24_hours(self):
        fetch, clock = Fetcher(), [1000.0]
        search_videos("DSA", "Stacks", fetch=fetch, api_key="k", now=lambda: clock[0])
        clock[0] += 23 * 3600
        again = search_videos("dsa", " stacks ", exclude_ids=["bbb222"], fetch=fetch, api_key="k", now=lambda: clock[0])
        self.assertEqual(len(fetch.calls), 1)
        self.assertEqual(again["source"], "cache")
        self.assertEqual([v["id"] for v in again["videos"]], ["aaa111"], "exclusions apply to cached results too")
        clock[0] += 2 * 3600
        search_videos("DSA", "Stacks", fetch=fetch, api_key="k", now=lambda: clock[0])
        self.assertEqual(len(fetch.calls), 2)

    def test_no_key_falls_back_to_curated_only_without_a_request(self):
        fetch = Fetcher()
        out = search_videos("DSA", "Stacks", fetch=fetch, api_key="")
        self.assertEqual(out, {"videos": [], "source": "curated_only", "reason": "no_api_key"})
        self.assertEqual(fetch.calls, [])

    def test_quota_exceeded_falls_back_and_is_not_retried_at_once(self):
        fetch = Fetcher(error=QuotaExceeded("quota"))
        out = search_videos("DSA", "Stacks", fetch=fetch, api_key="k")
        self.assertEqual((out["source"], out["reason"]), ("curated_only", "quota_exceeded"))
        again = search_videos("DSA", "Stacks", fetch=fetch, api_key="k")
        self.assertEqual(again["source"], "curated_only")
        self.assertEqual(len(fetch.calls), 1)

    def test_network_error_falls_back(self):
        out = search_videos("DSA", "Stacks", fetch=Fetcher(error=OSError("down")), api_key="k")
        self.assertEqual((out["source"], out["reason"]), ("curated_only", "search_failed"))


class VideoRouteTests(unittest.TestCase):
    def test_route_needs_a_token_and_falls_back_without_a_key(self):
        client = TestClient(app)
        self.assertEqual(client.get("/tutor/videos?subject=DSA&topic=Stacks").status_code, 401)
        ok = client.get("/tutor/videos?subject=DSA&topic=Stacks&exclude=a,b",
                        headers={"Authorization": f"Bearer {offline_env.token('video-user')}"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json(), {"videos": [], "source": "curated_only", "reason": "no_api_key"})


if __name__ == "__main__":
    unittest.main()
