"""Tutor conversation state: recent messages, a running summary and doubt detection."""
import re
from dataclasses import dataclass, field
from typing import Optional

MAX_TURNS = 8
SUMMARY_CHARS = 600
NOT_IN_DOCUMENTS = "NOT_IN_DOCUMENTS"
REFUSAL_TEXT = (
    "I could not find that in your documents, so I will not guess. "
    "Try asking about a topic from your syllabus, or switch off the documents toggle and I will teach it from general knowledge."
)


# Each time the student says they are lost, the same point is explained a different way.
DOUBT_STYLES = [
    ("simpler", "Use simpler, everyday words and shorter sentences. Drop the jargon, or define each term as you use it."),
    ("analogy", "Explain it with one concrete analogy from daily life in India, then connect the analogy back to the concept."),
    ("example", "Walk through one small worked example step by step, with actual values."),
]
NOTHING_TO_REEXPLAIN = "There is nothing to go over again yet. Ask me something and I will explain it."

_DOUBT_PHRASES = (
    "i did not get that", "i didn't get that", "i dont get it", "i don't get it", "did not understand", "didn't understand",
    "do not understand", "don't understand", "not clear", "i am confused", "i'm confused", "explain again", "explain that again",
    "say that again", "one more time", "come again", "samajh nahi", "samajh nahin", "samjha nahi", "phir se",
)


def is_doubt_trigger(text: str) -> bool:
    """True for a short spoken interruption like \"wait\" or \"I did not get that\", not for a real question."""
    cleaned = re.sub(r"[^a-z' ]+", " ", text.lower()).strip()
    words = cleaned.split()
    if not words or len(words) > 8:
        return False
    if all(word in ("wait", "hold", "on", "stop", "sorry", "what", "huh") for word in words) and words[0] in ("wait", "hold", "huh", "what"):
        return len(words) <= 3
    if words[0] == "wait" and len(words) <= 2:
        return True
    return any(phrase in cleaned for phrase in _DOUBT_PHRASES)


@dataclass
class Turn:
    role: str  # "student" or "tutor"
    text: str


@dataclass
class Conversation:
    """
    One tutor session's memory. Only the last MAX_TURNS messages are sent to the
    model in full; older ones are folded into a short running summary.
    """

    mode: str = "standalone"  # "standalone" or "documents"
    subject: str = ""
    topic: str = ""
    hinglish: bool = False
    history: list[Turn] = field(default_factory=list)
    summary: str = ""
    last_point: str = ""  # the explanation a doubt would refer to
    doubt_count: int = 0  # doubts raised on last_point so far

    def add(self, role: str, text: str) -> None:
        text = text.strip()
        if not text:
            return
        self.history.append(Turn(role, text))
        while len(self.history) > MAX_TURNS:
            self._fold(self.history.pop(0))

    def _fold(self, turn: Turn) -> None:
        """Keep the gist of a message that is leaving the window. No model call."""
        words = turn.text.split()
        gist = " ".join(words[:18]) + ("..." if len(words) > 18 else "")
        label = "Student asked" if turn.role == "student" else "Tutor covered"
        self.summary = f"{self.summary} {label}: {gist}".strip()
        if len(self.summary) > SUMMARY_CHARS:
            # Drop the oldest part, cutting at a word boundary.
            self.summary = "..." + self.summary[-SUMMARY_CHARS:].split(" ", 1)[-1]

    def note_reply(self, text: str, was_doubt: bool = False) -> None:
        """Record a tutor reply. A fresh explanation becomes the new point; a re-explanation keeps the original one."""
        self.add("tutor", text)
        if not was_doubt and text.strip():
            self.last_point = text.strip()
            self.doubt_count = 0

    def next_doubt_style(self) -> tuple[str, str]:
        """The (name, instruction) for the next re-explanation: simpler, then an analogy, then an example, then round again."""
        style = DOUBT_STYLES[self.doubt_count % len(DOUBT_STYLES)]
        self.doubt_count += 1
        return style

    def build_doubt_prompt(self, instruction: str, student_text: str = "") -> str:
        """The prompt for explaining last_point again in a different way."""
        said = student_text.strip() or "I did not get that."
        request = (
            f"{said}\n\n"
            "(The student did not understand your last explanation, quoted here: "
            f"\"{self.last_point[:900]}\"\n"
            f"Explain that same point again, differently. {instruction} "
            "Do not reuse your earlier wording and do not move on to a new idea. "
            "Finish by asking whether it is clearer now.)"
        )
        return self.build_prompt(request)

    def transcript(self) -> list[dict]:
        return [{"role": t.role, "text": t.text} for t in self.history]

    def build_prompt(self, student_text: str, context_chunks: Optional[list[dict]] = None) -> str:
        """The prompt for the next tutor reply. Does not add the student's message to history."""
        focus = self.topic or self.subject or "computer science"
        subject_line = f"Subject: {self.subject}. " if self.subject else ""

        lines = [
            "You are Aria, a patient voice tutor for Indian computer science students. You are speaking aloud, not writing.",
            f"{subject_line}Current topic: {focus}.",
            "",
            "How to reply:",
            "- 60 to 120 words. Short spoken sentences. One idea at a time.",
            "- Make your FIRST sentence short, ten words or fewer, so you can start speaking at once.",
            "- No markdown, bullet points, headings, tables or code blocks. Say code and symbols in words unless the student asks to see code.",
            "- Build on what was already covered; do not repeat it.",
            "- End with one short question that checks understanding or invites the next step.",
        ]

        if self.hinglish:
            lines += [
                "- Reply in natural Hinglish: Hindi and English mixed the way Indian students talk, written ONLY in Roman (Latin) script. Never use Devanagari.",
                "- Keep technical terms, keywords, function names and code in English exactly as they are written.",
                "- Example of the register: \"Stack ek aisa structure hai jisme last in, first out hota hai. Matlab jo cheez sabse baad mein daali, wahi sabse pehle niklegi.\"",
            ]

        if self.mode == "documents":
            lines += [
                "",
                "Answer ONLY from the syllabus excerpts below. Do not add facts from general knowledge.",
                f"If the excerpts do not contain the answer, reply with exactly {NOT_IN_DOCUMENTS} and nothing else.",
                "",
                "SYLLABUS EXCERPTS:",
            ]
            for i, chunk in enumerate(context_chunks or []):
                lines.append(f"[{i + 1}] {chunk['text'][:500]}")
            if not context_chunks:
                lines.append("(none found)")

        if self.summary:
            lines += ["", f"EARLIER IN THIS SESSION: {self.summary}"]

        if self.history:
            lines += ["", "RECENT CONVERSATION:"]
            for turn in self.history:
                lines.append(f"{'Student' if turn.role == 'student' else 'Aria'}: {turn.text}")

        lines += ["", f"Student: {student_text.strip()}", "Aria:"]
        return "\n".join(lines)
