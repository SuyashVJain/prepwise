"""The one subject list, and cleaning for subject names a student types.

frontend/data/subjects.json is an identical copy of subjects.json; a test keeps them in sync.
"""
import json
import re
from pathlib import Path

SUBJECTS: list[dict] = json.loads((Path(__file__).resolve().parent / "subjects.json").read_text(encoding="utf-8"))
CS_SUBJECTS = [s["name"] for s in SUBJECTS]

MAX_SUBJECT_CHARS = 60

_CONTROL = re.compile(r"[\x00-\x1f\x7f]+")
_UNSAFE = re.compile(r"[`{}<>\\]")


def clean_subject(text: object, limit: int = MAX_SUBJECT_CHARS) -> str:
    """A subject name that is safe to put in a prompt or a search: one line, no markup characters, capped."""
    text = _CONTROL.sub(" ", str(text or ""))
    text = _UNSAFE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()[:limit]
