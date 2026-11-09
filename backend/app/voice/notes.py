"""Session notes and flashcards from a tutor conversation."""
from typing import Callable, Optional

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 400
MIN_CARDS = 5
MAX_CARDS = 8


class NotEnoughToSummarise(ValueError):
    """The session has no tutor explanation to make notes from."""


def _clip(transcript: list[dict]) -> list[dict]:
    """Keep the prompt small: the last MAX_MESSAGES messages, each cut to MAX_MESSAGE_CHARS."""
    cleaned = []
    for message in transcript:
        text = str(message.get("text") or "").strip()
        role = "tutor" if message.get("role") == "tutor" else "student"
        if text:
            cleaned.append({"role": role, "text": text[:MAX_MESSAGE_CHARS]})
    return cleaned[-MAX_MESSAGES:]


def build_notes_prompt(transcript: list[dict], subject: str = "", topic: str = "") -> str:
    lines = [f"{'Aria' if m['role'] == 'tutor' else 'Student'}: {m['text']}" for m in transcript]
    focus = topic or subject or "computer science"
    return f"""You are Aria, a tutor for Indian computer science students. A voice tutoring session on "{focus}" just ended.

TRANSCRIPT:
{chr(10).join(lines)}

Write revision notes for the student, using ONLY what was covered in the transcript.
- "summary": 3 to 5 plain sentences on what was learned, in the order it was taught.
- "flashcards": {MIN_CARDS} to {MAX_CARDS} cards. Each "front" is a short question; each "back" is the answer in one or two sentences.
- Write in English even if the session was in Hinglish. Keep code and technical terms exact.
- If the session covered very little, make fewer cards rather than inventing content.

Respond ONLY with valid JSON, no markdown, no extra text:
{{
  "summary": "...",
  "flashcards": [{{"front": "...", "back": "..."}}]
}}"""


def make_notes(
    transcript: list[dict],
    subject: str = "",
    topic: str = "",
    llm_json: Optional[Callable[..., dict]] = None,
) -> dict:
    """One LLM call that turns a session transcript into a summary and flashcards."""
    clipped = _clip(transcript)
    if not any(m["role"] == "tutor" for m in clipped) or len(clipped) < 2:
        raise NotEnoughToSummarise("The session is too short to make notes from.")

    if llm_json is None:
        from app.services.gemini import call_llm_json
        llm_json = call_llm_json

    data = llm_json(build_notes_prompt(clipped, subject, topic), temperature=0.3, max_tokens=1200)

    cards = []
    for item in data.get("flashcards") or []:
        if not isinstance(item, dict):
            continue
        front, back = str(item.get("front") or "").strip(), str(item.get("back") or "").strip()
        if front and back:
            cards.append({"front": front, "back": back})
    summary = str(data.get("summary") or "").strip()
    if not summary and not cards:
        raise ValueError("notes reply had no summary and no flashcards")
    return {"summary": summary, "flashcards": cards[:MAX_CARDS]}
