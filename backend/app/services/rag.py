# prepwise-api/app/services/rag.py
import fitz
import re
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import Optional
import random

print("Loading embedding model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2')
print("Embedding model loaded.")

DIMENSION = 384

CS_SUBJECTS = [
    "Data Structures and Algorithms",
    "Operating Systems",
    "Database Management Systems",
    "Computer Networks",
    "Object Oriented Programming",
    "System Design",
    "Compiler Design",
    "Theory of Computation",
    "Computer Organization and Architecture",
    "Software Engineering",
    "Artificial Intelligence",
    "Machine Learning",
    "Web Technologies",
    "Discrete Mathematics",
    "Digital Electronics",
]


class SyllabusRAG:
    """
    Full RAG pipeline:
    1. Ingest PDF or topic list
    2. Chunk into meaningful segments
    3. Embed with sentence-transformers (all-MiniLM-L6-v2)
    4. Store in FAISS IndexFlatL2
    5. Retrieve top-k semantically relevant chunks for any query
    """

    def __init__(self):
        self.chunks: list[str] = []
        self.metadata: list[dict] = []
        self.index: Optional[faiss.IndexFlatL2] = None

    def _embed(self, texts: list[str]) -> np.ndarray:
        vectors = embedder.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return vectors.astype('float32')

    def _build_index(self):
        if not self.chunks:
            return
        vectors = self._embed(self.chunks)
        self.index = faiss.IndexFlatL2(DIMENSION)
        self.index.add(vectors)
        print(f"FAISS index built: {len(self.chunks)} chunks, dim={DIMENSION}")

    def ingest_pdf(self, pdf_path: str, university: str = "", semester: int = 0):
        """Parse PDF -> chunk -> embed -> build FAISS index."""
        self.chunks = []
        self.metadata = []
        pages = self._extract_pdf_text(pdf_path)
        extracted = self._chunk_text(pages)

        for chunk in extracted:
            self.chunks.append(chunk["text"])
            self.metadata.append({
                "topic": chunk["heading"],
                "university": university,
                "semester": semester,
                "type": "pdf",
                "page": chunk.get("page", 0),
            })

        if self.chunks:
            self._build_index()
        else:
            print("PDF yielded no chunks, falling back to generic CS topics")
            self.ingest_topics(CS_SUBJECTS, university, semester)

    def ingest_topics(self, topics: list[str], university: str = "", semester: int = 0):
        """Expand topic list into rich chunks, embed, and index."""
        self.chunks = []
        self.metadata = []

        for topic in topics:
            variations = [
                f"Topic: {topic}",
                f"Subject: {topic}. Key concepts, definitions, and fundamentals of {topic}.",
                f"Interview questions about {topic} for computer science placement preparation.",
                f"Core syllabus content: {topic}. Important for {university} semester {semester} examinations and campus placements.",
                f"Technical deep-dive: {topic}. Common interview questions, algorithms, and implementation details.",
            ]
            for chunk in variations:
                self.chunks.append(chunk)
                self.metadata.append({
                    "topic": topic,
                    "university": university,
                    "semester": semester,
                    "type": "manual",
                })

        if self.chunks:
            self._build_index()

    def ingest_from_stored(self, chunks: list[str], metadata: list[dict]):
        """
        Rebuild FAISS index from previously stored chunks.
        No re-embedding needed - just re-index the same vectors.
        """
        self.chunks = chunks
        self.metadata = metadata
        if self.chunks:
            self._build_index()

    def retrieve(self, query: str, k: int = 3) -> list[dict]:
        """Retrieve top-k most semantically relevant chunks for a query."""
        if not self.index or not self.chunks:
            return []

        query_vec = self._embed([query])
        k = min(k, len(self.chunks))
        distances, indices = self.index.search(query_vec, k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(self.chunks):
                results.append({
                    "text": self.chunks[idx],
                    "metadata": self.metadata[idx],
                    "score": float(1 / (1 + dist)),
                })
        return results

    def get_all_topics(self) -> list[str]:
        """Return deduplicated list of topics from metadata."""
        seen = set()
        topics = []
        for m in self.metadata:
            t = m.get("topic", "").strip()
            if t and t not in seen:
                seen.add(t)
                topics.append(t)
        return topics

    def serialize(self) -> dict:
        """Serialize for Supabase storage."""
        return {
            "chunks": self.chunks,
            "metadata": self.metadata,
        }

    # ── PDF PARSING ──

    def _extract_pdf_text(self, pdf_path: str) -> list[dict]:
        pages = []
        try:
            doc = fitz.open(pdf_path)
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    pages.append({"page": page_num + 1, "text": text})
            doc.close()
        except Exception as e:
            print(f"PDF extraction error: {e}")
        return pages

    def _chunk_text(self, pages: list[dict]) -> list[dict]:
        chunks = []
        current_heading = "General"
        current_text = []
        current_page = 1

        heading_patterns = [
            r'^(unit|module|chapter|section)\s*[-:]?\s*\d*\s*[-:]?\s*(.+)',
            r'^\d+[\.\)]\s+([A-Z][A-Za-z\s]{4,})',
            r'^([A-Z][A-Z\s]{5,50})$',
        ]

        for page_data in pages:
            lines = page_data["text"].split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                is_heading = False
                for pattern in heading_patterns:
                    if re.match(pattern, line, re.IGNORECASE):
                        if current_text:
                            chunks.append({
                                "heading": current_heading,
                                "text": f"{current_heading}: {' '.join(current_text[:150])}",
                                "page": current_page,
                            })
                        current_heading = line[:80]
                        current_text = []
                        current_page = page_data["page"]
                        is_heading = True
                        break

                if not is_heading and len(line) > 10:
                    current_text.append(line)
                    if len(current_text) >= 20:
                        chunks.append({
                            "heading": current_heading,
                            "text": f"{current_heading}: {' '.join(current_text)}",
                            "page": current_page,
                        })
                        current_text = current_text[-3:]

        if current_text:
            chunks.append({
                "heading": current_heading,
                "text": f"{current_heading}: {' '.join(current_text[:150])}",
                "page": current_page,
            })

        return chunks


# ── HELPER FUNCTIONS ──

def select_topic_for_question(
    topics: list[str],
    asked_topics: list[str],
    interview_type: str,
) -> str:
    """Pick the next topic to ask about, avoiding recent repeats."""
    available = [t for t in topics if t not in asked_topics[-3:]]
    if not available:
        available = topics if topics else CS_SUBJECTS

    if interview_type == "system_design":
        design_kw = ['design', 'architecture', 'system', 'scale', 'network', 'distributed', 'database']
        design_topics = [t for t in available if any(kw in t.lower() for kw in design_kw)]
        if design_topics:
            return design_topics[0]

    if interview_type == "hr":
        return "Behavioral and Situational Leadership"

    return random.choice(available)


def build_rag(
    topics: list[str],
    raw_chunks: list[str],
    chunks_metadata: list[dict],
    university: str,
    semester: int,
) -> SyllabusRAG:
    """
    Build RAG from whatever data is available:
    1. Stored chunks from Supabase (best - previously embedded)
    2. Topic list (fallback)
    3. Generic CS subjects (last resort)
    """
    rag = SyllabusRAG()

    if raw_chunks and chunks_metadata:
        rag.ingest_from_stored(raw_chunks, chunks_metadata)
    elif topics:
        rag.ingest_topics(topics, university, semester)
    else:
        rag.ingest_topics(CS_SUBJECTS, university, semester)

    return rag
