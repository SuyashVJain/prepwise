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


def clean_for_speech(text: str) -> str:
    """Remove markup a voice should not read out."""
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"\[Source:[^\]]*\]", " ", text)
    text = re.sub(r"[*_`#>]+", "", text)
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", text).strip()


def word_count(text: str) -> int:
    return len(text.split())
