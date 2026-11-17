"""Text helpers for speech: sentence splitting and cleaning."""
import re

# Sentence end: terminal punctuation, optional closing quote/bracket, then whitespace.
_SENTENCE_END = re.compile(r'([.!?।]+["\')\]]*)(\s+)')
_ABBREVIATIONS = ("e.g.", "i.e.", "etc.", "vs.", "mr.", "mrs.", "dr.", "no.", "fig.", "approx.")


class SentenceSplitter:
    """
    Turns a stream of text fragments into complete sentences, so each sentence can be
    spoken while the rest of the reply is still being generated.
    """

    def __init__(self, min_chars: int = 16):
        self.min_chars = min_chars
        self._buffer = ""

    def feed(self, fragment: str) -> list[str]:
        """Add a fragment and return any sentences it completed."""
        self._buffer += fragment
        sentences = []
        start = 0
        for match in _SENTENCE_END.finditer(self._buffer):
            candidate = self._buffer[start:match.end(1)].strip()
            if len(candidate) < self.min_chars or candidate.lower().endswith(_ABBREVIATIONS):
                continue
            sentences.append(candidate)
            start = match.end()
        self._buffer = self._buffer[start:]
        return sentences

    def flush(self) -> list[str]:
        """Return whatever is left when the stream ends."""
        rest = self._buffer.strip()
        self._buffer = ""
        return [rest] if rest else []


def split_sentences(text: str) -> list[str]:
    splitter = SentenceSplitter()
    return splitter.feed(text) + splitter.flush()


def _cut_point(text: str, limit: int) -> int:
    """Where to cut a piece longer than `limit`: after a comma or similar mark if there is one late enough, else at a space, else at the limit."""
    window = text[:limit]
    marks = [m.end() for m in re.finditer(r"[,;:\u2014\u2013]\s", window)]
    if marks and marks[-1] >= limit * 0.4:
        return marks[-1]
    space = window.rfind(" ")
    return space if space >= limit * 0.4 else limit


def chunk_text(text: str, limit: int = 200) -> list[str]:
    """
    Pieces of at most `limit` characters, in reading order: each sentence on its own, and a sentence that is longer
    than the limit split at a comma or a space. Used for speech services that accept a limited text length.
    """
    chunks: list[str] = []
    for sentence in split_sentences(text):
        rest = " ".join(sentence.split())
        while len(rest) > limit:
            cut = _cut_point(rest, limit)
            piece = rest[:cut].strip()
            if piece:
                chunks.append(piece)
            rest = rest[cut:].strip()
        if rest:
            chunks.append(rest)
    return chunks


def clean_for_speech(text: str) -> str:
    """Remove markup a voice should not read out."""
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"\[Source:[^\]]*\]", " ", text)
    text = re.sub(r"[*_`#>]+", "", text)
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", text).strip()


def word_count(text: str) -> int:
    return len(text.split())
