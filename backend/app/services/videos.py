"""Video suggestions for the voice tutor, with a small in-memory cache."""
import time
from typing import Callable, Optional

from app.config import YOUTUBE_API_KEY

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
CACHE_SECONDS = 24 * 60 * 60
FAILURE_CACHE_SECONDS = 60 * 60  # do not retry a failing or exhausted key on every page view
MAX_RESULTS = 12
MAX_CACHE_ENTRIES = 500

# (subject, topic) -> (expires_at, videos or None, reason)
_cache: dict[tuple[str, str], tuple[float, Optional[list[dict]], str]] = {}


def _fetch(params: dict) -> dict:
    import httpx

    response = httpx.get(SEARCH_URL, params=params, timeout=10.0)
    if response.status_code == 403:
        raise QuotaExceeded(response.text[:200])
    response.raise_for_status()
    return response.json()


class QuotaExceeded(RuntimeError):
    pass


def _parse(payload: dict) -> list[dict]:
    videos = []
    for item in payload.get("items", []):
        video_id = (item.get("id") or {}).get("videoId")
        snippet = item.get("snippet") or {}
        if not video_id or not snippet.get("title"):
            continue
        videos.append({
            "id": video_id,
            "title": snippet["title"],
            "channel": snippet.get("channelTitle", ""),
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
            "url": f"https://www.youtube.com/watch?v={video_id}",
        })
    return videos


def search_videos(
    subject: str,
    topic: str,
    exclude_ids: Optional[list[str]] = None,
    fetch: Callable[[dict], dict] = _fetch,
    api_key: Optional[str] = None,
    now: Callable[[], float] = time.time,
) -> dict:
    """
    More videos for a subject and topic from the YouTube Data API, cached for 24 hours.
    Returns {"videos": [...], "source": "api" | "cache" | "curated_only", "reason": str}.
    "curated_only" means the caller should show just its hand-picked cards.
    """
    key = YOUTUBE_API_KEY if api_key is None else api_key
    excluded = set(exclude_ids or [])
    cache_key = (subject.strip().lower(), topic.strip().lower())

    def result(videos: Optional[list[dict]], source: str, reason: str = "") -> dict:
        if videos is None:
            return {"videos": [], "source": "curated_only", "reason": reason}
        return {"videos": [v for v in videos if v["id"] not in excluded], "source": source, "reason": reason}

    if not key:
        return result(None, "curated_only", "no_api_key")

    cached = _cache.get(cache_key)
    if cached and cached[0] > now():
        return result(cached[1], "cache", cached[2])

    query = " ".join(part for part in (topic.strip(), subject.strip(), "tutorial") if part)
    try:
        payload = fetch({
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": MAX_RESULTS,
            "safeSearch": "strict",
            "relevanceLanguage": "en",
            "key": key,
        })
        videos = _parse(payload)
    except QuotaExceeded:
        _remember(cache_key, now() + FAILURE_CACHE_SECONDS, None, "quota_exceeded")
        return result(None, "curated_only", "quota_exceeded")
    except Exception as e:
        print(f"videos: search failed ({type(e).__name__})")
        _remember(cache_key, now() + 300, None, "search_failed")
        return result(None, "curated_only", "search_failed")

    _remember(cache_key, now() + CACHE_SECONDS, videos, "")
    return result(videos, "api")


def _remember(cache_key, expires_at: float, videos: Optional[list[dict]], reason: str) -> None:
    if len(_cache) >= MAX_CACHE_ENTRIES:
        _cache.pop(next(iter(_cache)))
    _cache[cache_key] = (expires_at, videos, reason)


def clear_cache() -> None:
    _cache.clear()
