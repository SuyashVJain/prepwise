"""Public demo: score one answer to one of three fixed sample questions, with no sign-in."""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.limits import limiter
from app.services.scorer import evaluate_answer

router = APIRouter(prefix="/demo", tags=["demo"])

MAX_ANSWER_CHARS = 600
MIN_ANSWER_CHARS = 20
GLOBAL_DAILY_CAP = 150
GLOBAL_PER_MINUTE_CAP = 6  # keeps the shared model quota (tokens per minute) safe

BUSY = "The demo is busy, sign up to continue."

# Fixed questions with a certain hint, so the check never depends on retrieval.
QUESTIONS = {
    "dijkstra": {
        "question": "Explain how Dijkstra's algorithm works and what it needs from the graph.",
        "topic": "Graph algorithms",
        "keywords": ["priority queue", "non-negative weights", "relaxation", "shortest path"],
        "hint": "Dijkstra finds shortest paths from one source by repeatedly taking the unvisited vertex with the smallest known distance and relaxing its edges. It needs non-negative edge weights. With a binary heap it runs in O((V + E) log V).",
    },
    "tcp_udp": {
        "question": "What is the difference between TCP and UDP, and when would you choose each?",
        "topic": "Computer Networks",
        "keywords": ["connection", "reliable", "ordering", "handshake", "datagram"],
        "hint": "TCP is connection-oriented and reliable: a three-way handshake, acknowledgements, retransmission, ordered delivery, flow and congestion control. UDP is connectionless with no delivery or ordering guarantee and low overhead. Use TCP for web pages and file transfer, UDP for DNS, streaming and games.",
    },
    "normalisation": {
        "question": "What is database normalisation and why is it used?",
        "topic": "Database Management Systems",
        "keywords": ["redundancy", "anomalies", "normal form", "functional dependency", "decomposition"],
        "hint": "Normalisation organises tables using functional dependencies, through normal forms such as 1NF, 2NF, 3NF and BCNF, to reduce redundancy and avoid insertion, update and deletion anomalies. It decomposes tables; too much of it can mean more joins.",
    },
}

_day = {"date": "", "count": 0}
_minute: list[float] = []


def reset_global_counters() -> None:
    _day.update(date="", count=0)
    _minute.clear()


def _global_slot() -> bool:
    """Take one slot from the shared daily and per-minute budgets. In memory only, counts only."""
    today = datetime.now(timezone.utc).date().isoformat()
    if _day["date"] != today:
        _day.update(date=today, count=0)
    now = time.monotonic()
    _minute[:] = [t for t in _minute if now - t < 60]
    if _day["count"] >= GLOBAL_DAILY_CAP or len(_minute) >= GLOBAL_PER_MINUTE_CAP:
        return False
    _day["count"] += 1
    _minute.append(now)
    return True


def client_ip(request: Request) -> str:
    """First address in X-Forwarded-For (set by the host's proxy), else the socket address."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded.strip():
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class DemoRequest(BaseModel):
    question_id: str
    answer: str


@router.get("/questions")
async def demo_questions():
    return [{"id": k, "question": v["question"]} for k, v in QUESTIONS.items()]


@router.post("/check")
@limiter.limit("3/minute;10/day", key_func=client_ip)
async def demo_check(request: Request, req: DemoRequest):
    q = QUESTIONS.get(req.question_id)
    answer = req.answer.strip()
    if q is None:
        return JSONResponse(status_code=422, content={"message": "Choose one of the sample questions."})
    if len(req.answer) > MAX_ANSWER_CHARS:
        return JSONResponse(status_code=422, content={"message": f"Keep the answer under {MAX_ANSWER_CHARS} characters."})
    if len(answer) < MIN_ANSWER_CHARS:
        return JSONResponse(status_code=422, content={"message": f"Write at least {MIN_ANSWER_CHARS} characters."})
    if not _global_slot():
        return JSONResponse(status_code=429, content={"limited": True, "message": BUSY})

    try:
        result = await evaluate_answer(
            question=q["question"], answer=answer, topic=q["topic"],
            expected_keywords=q["keywords"], ideal_answer_hint=q["hint"],
        )
    except Exception:
        return JSONResponse(status_code=503, content={"message": "The demo could not score that just now. Try again in a minute."})
    return {"question": q["question"], **result}
