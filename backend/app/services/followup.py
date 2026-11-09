"""Decide whether the next question should probe the answer just given. Pure logic, no LLM call."""
from typing import Optional

WEAK_SCORE = 5.0
# Worst first: a critical error, then any incorrect claim, then a claim that could not be checked.
_ORDER = ("critical", "incorrect", "unverifiable")


def _rank(claim: dict) -> Optional[int]:
    verdict = claim.get("verdict")
    if verdict == "incorrect":
        return 0 if claim.get("critical") else 1
    if verdict == "unverifiable":
        return 2
    return None


def decide_follow_up(
    score: float,
    claims: list[dict],
    weak_areas: list[str],
    last_was_follow_up: bool,
    follow_ups_so_far: int,
    total_questions: int,
) -> Optional[str]:
    """Return what the follow-up should probe, or None to move on to a new topic."""
    if last_was_follow_up:
        return None  # at most one follow-up per base question
    if follow_ups_so_far >= total_questions // 3:
        return None  # never more than a third of the session
    flagged = sorted((c for c in claims if _rank(c) is not None), key=_rank)
    if flagged:
        return str(flagged[0].get("claim", "")).strip() or None
    if score < WEAK_SCORE:
        return (weak_areas[0] if weak_areas else "the core idea of the question").strip()
    return None
