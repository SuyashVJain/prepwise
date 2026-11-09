"""Syllabus routes: PDF upload, manual topics and the built-in subject list."""
from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user
from app.limits import upload_limit, default_limit
from app.services.rag import SyllabusRAG, CS_SUBJECTS
import tempfile
import os

router = APIRouter(prefix="/syllabus", tags=["syllabus"], dependencies=[Depends(get_current_user)])


class ManualTopicsRequest(BaseModel):
    topics: list[str]
    university: str = ""
    semester: int = 0


@router.post("/upload")
@upload_limit
async def upload_syllabus(
    request: Request,
    file: UploadFile = File(...),
    university: str = "",
    semester: int = 0,
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        rag = SyllabusRAG()
        rag.ingest_pdf(tmp_path, university, semester)

        if not rag.chunks:
            raise HTTPException(status_code=422, detail="Could not extract content from this PDF. Try a text-based PDF.")

        serialized = rag.serialize()
        topics = rag.get_all_topics()

        return {
            "success": True,
            "topics": topics,
            "topic_count": len(topics),
            "chunk_count": len(rag.chunks),
            "raw_chunks": serialized["chunks"],
            "metadata": serialized["metadata"],
        }
    finally:
        os.unlink(tmp_path)


@router.post("/manual")
@default_limit
async def manual_topics(request: Request, req: ManualTopicsRequest):
    topics = [t.strip() for t in req.topics if t.strip()]
    if not topics:
        raise HTTPException(status_code=400, detail="Topics list cannot be empty")

    rag = SyllabusRAG()
    rag.ingest_topics(topics, req.university, req.semester)
    serialized = rag.serialize()

    return {
        "success": True,
        "topics": topics,
        "topic_count": len(topics),
        "chunk_count": len(rag.chunks),
        "raw_chunks": serialized["chunks"],
        "metadata": serialized["metadata"],
    }


@router.get("/subjects")
@default_limit
async def get_cs_subjects(request: Request):
    """Return the built-in CS subject list for manual selection."""
    return {"subjects": CS_SUBJECTS}
