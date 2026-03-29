# prepwise-api/app/routers/study.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.rag import SyllabusRAG
from app.services.gemini import call_llm, clean_json
import tempfile, os, json

router = APIRouter(prefix="/study", tags=["study"])


def extract_text_from_pdf(path: str) -> str:
    import fitz
    text = ""
    try:
        doc = fitz.open(path)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"PDF error: {e}")
    return text.strip()

def extract_text_from_docx(path: str) -> str:
    try:
        import docx
        doc = docx.Document(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        print(f"DOCX error: {e}")
        return ""

def extract_text_from_txt(path: str) -> str:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except:
        return ""

def extract_text(path: str, filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        return extract_text_from_pdf(path)
    elif ext == 'docx':
        return extract_text_from_docx(path)
    elif ext == 'txt':
        return extract_text_from_txt(path)
    elif ext in ['png', 'jpg', 'jpeg']:
        return "[Image file - text extraction not supported. Please use PDF or text files.]"
    return ""

def chunk_text(text: str, source: str, chunk_size: int = 400, overlap: int = 50) -> list[dict]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk_str = " ".join(chunk_words)
        if len(chunk_str) > 50:
            chunks.append({"text": chunk_str, "source": source})
        i += chunk_size - overlap
    return chunks


class ChatMessage(BaseModel):
    role: str
    content: str

class DocChunk(BaseModel):
    text: str
    source: str

class ChatRequest(BaseModel):
    chunks: list[DocChunk] = []
    document_text: str = ""
    history: list[ChatMessage] = []
    message: str

class QuizRequest(BaseModel):
    chunks: list[DocChunk] = []
    document_text: str = ""
    num_questions: int = 5
    difficulty: str = "medium"


def retrieve_relevant_chunks(query: str, chunks: list[DocChunk], k: int = 10) -> list[DocChunk]:
    if not chunks:
        return []
    rag = SyllabusRAG()
    texts = [c.text for c in chunks]
    metadata = [{"source": c.source, "type": "study"} for c in chunks]
    rag.ingest_from_stored(texts, metadata)
    results = rag.retrieve(query, k=k)
    retrieved = []
    for r in results:
        source = r["metadata"].get("source", "")
        retrieved.append(DocChunk(text=r["text"], source=source))
    return retrieved

def sample_chunks_for_quiz(chunks: list[DocChunk], max_words: int = 4000) -> str:
    by_source: dict[str, list[str]] = {}
    for chunk in chunks:
        if chunk.source not in by_source:
            by_source[chunk.source] = []
        by_source[chunk.source].append(chunk.text)
    result_parts = []
    words_per_source = max_words // max(len(by_source), 1)
    for source, texts in by_source.items():
        combined = " ".join(texts)
        words = combined.split()[:words_per_source]
        result_parts.append(f"=== {source} ===\n{' '.join(words)}")
    result = "\n\n".join(result_parts)
    return result[:8000]  # hard character cap

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg']
    ext = file.filename.lower().split('.')[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed)}")
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 15MB.")
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        text = extract_text(tmp_path, file.filename)
        if not text or len(text) < 50:
            raise HTTPException(status_code=422, detail="Could not extract meaningful text from this file.")
        chunks = chunk_text(text, file.filename)
        word_count = len(text.split())
        return {
            "success": True,
            "filename": file.filename,
            "text": text[:50000],
            "chunks": chunks,
            "word_count": word_count,
            "chunk_count": len(chunks),
            "truncated": len(text) > 50000,
        }
    finally:
        os.unlink(tmp_path)


@router.post("/chat")
async def chat_with_document(req: ChatRequest):
    BROAD_KEYWORDS = ['list', 'all', 'each', 'every', 'summarize', 'summary', 'overview', 'topics', 'what is in', 'tell me about all']
    is_broad = any(kw in req.message.lower() for kw in BROAD_KEYWORDS)

    if req.chunks and not is_broad:
        relevant = retrieve_relevant_chunks(req.message, req.chunks, k=10)
        context_str = ""
        sources_used = set()
        for chunk in relevant:
            context_str += f"\n[From: {chunk.source}]\n{chunk.text}\n"
            sources_used.add(chunk.source)
    else:
        by_source: dict[str, list[str]] = {}
        for chunk in (req.chunks or []):
            if chunk.source not in by_source:
                by_source[chunk.source] = []
            by_source[chunk.source].append(chunk.text)
        context_str = ""
        sources_used = set()
        for source, texts in by_source.items():
            sample = " ".join(texts[:3])
            context_str += f"\n[From: {source}]\n{sample}\n"
            sources_used.add(source)
        if not context_str:
            context_str = req.document_text[:10000]

    history_str = ""
    for msg in req.history[-6:]:
        role = "Student" if msg.role == "user" else "Aria"
        history_str += f"{role}: {msg.content}\n"

    prompt = f"""You are Aria, a precise and helpful AI study assistant.

RELEVANT CONTENT FROM DOCUMENTS (answer based on this):
---
{context_str}
---

CONVERSATION SO FAR:
{history_str}
Student: {req.message}

Instructions:
- Answer based on the document content above
- Only cite the source ONCE at the end of each paragraph, not after every sentence
- Format citations as [Source: filename] only at paragraph endings
- If all content is from one document, cite once at the very end
- Be concise but thorough. Break down complex concepts step by step.

Aria:"""

    response = call_llm(prompt, temperature=0.4, max_tokens=1000)
    return {"response": response, "sources_used": list(sources_used)}


@router.post("/quiz")
async def generate_quiz(req: QuizRequest):
    if req.chunks:
        doc_context = sample_chunks_for_quiz(req.chunks, max_words=4000)
    elif req.document_text:
        doc_context = req.document_text[:12000]
    else:
        raise HTTPException(status_code=400, detail="No document content provided")

    difficulty_guide = {
        "easy": "factual recall, definitions, basic concepts",
        "medium": "application of concepts, comparisons, cause-effect relationships",
        "hard": "analysis, synthesis, edge cases, deep understanding",
    }

    prompt = f"""You are Aria, an expert quiz generator for students.

Generate {req.num_questions} multiple choice questions from this study material:
---
{doc_context}
---

Difficulty: {req.difficulty} - focus on {difficulty_guide.get(req.difficulty, 'medium concepts')}

Rules:
- Questions must be directly answerable from the material above
- Each question has exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Wrong options should be plausible, not obviously wrong
- Cover content from ALL documents provided

Respond ONLY with valid JSON, no markdown, no extra text:
{{
  "questions": [
    {{
      "question": "question text",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct": "A",
      "explanation": "why correct"
    }}
  ]
}}"""

    text = call_llm(prompt, temperature=0.5, max_tokens=2000)
    try:
        result = json.loads(clean_json(text))
    except json.JSONDecodeError as e:
        print(f"Quiz JSON parse error: {e}")
        print(f"Raw response: {text[:500]}")
        raise HTTPException(status_code=500, detail="Failed to parse quiz response. Try again.")
    return result