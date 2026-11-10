"""Interview routes: start a session, next question or follow-up, submit an answer, debrief."""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
from app.auth import get_current_user
from app.limits import llm_limit
from app.services.followup import decide_follow_up
from app.services.gemini import generate_question
from app.services.rag import select_topic_for_question, build_rag, get_cached_rag, CS_SUBJECTS
from app.services.scorer import evaluate_answer, generate_session_debrief
from app.subjects import clean_subject

router = APIRouter(prefix="/interview", tags=["interview"], dependencies=[Depends(get_current_user)])


class StartSessionRequest(BaseModel):
    university: str = ""
    semester: int = 5
    interview_type: str = "technical"
    target_company: str = "faang"
    total_questions: int = 10
    topics: list[str] = []
    raw_chunks: list[str] = []
    chunks_metadata: list[dict] = []


class LastResult(BaseModel):
    question: str = Field("", max_length=2000)
    topic: str = Field("", max_length=200)
    score: float = 10.0
    weak_areas: list[str] = Field(default_factory=list, max_length=10)
    claims: list[dict] = Field(default_factory=list, max_length=8)


class NextQuestionRequest(BaseModel):
    university: str = ""
    semester: int = 5
    interview_type: str = "technical"
    target_company: str = "faang"
    asked_topics: list[str] = []
    previous_questions: list[str] = []
    question_number: int = 1
    topics: list[str] = []
    raw_chunks: list[str] = []
    chunks_metadata: list[dict] = []
    last_result: Optional[LastResult] = None
    last_was_follow_up: bool = False
    follow_ups_so_far: int = 0
    total_questions: int = 10


class SubmitAnswerRequest(BaseModel):
    question: str
    answer: str
    topic: str
    expected_keywords: list[str] = []
    ideal_answer_hint: str = ""
    # Recorded by the client for pacing; scoring ignores it.
    time_taken_seconds: Optional[int] = Field(None, ge=0, le=86400)


class DebriefRequest(BaseModel):
    questions: list[dict]
    interview_type: str
    target_company: str


@router.post("/start")
@llm_limit
async def start_session(request: Request, req: StartSessionRequest):
    req.topics = [t for t in (clean_subject(t, 200) for t in req.topics) if t]
    rag = build_rag(
        topics=req.topics,
        raw_chunks=req.raw_chunks,
        chunks_metadata=req.chunks_metadata,
        university=req.university,
        semester=req.semester,
        user_id=request.state.user_id,
    )

    topics = rag.get_all_topics() or req.topics or CS_SUBJECTS
    topic = select_topic_for_question(topics, [], req.interview_type)

    query = f"{req.interview_type} interview question about {topic} for {req.target_company} style company"
    rag_context = rag.retrieve(query, k=3)

    question_data = await generate_question(
        topic=topic,
        interview_type=req.interview_type,
        target_company=req.target_company,
        difficulty=5,
        previous_questions=[],
        rag_context=rag_context,
    )

    return {
        "question_number": 1,
        "total_questions": req.total_questions,
        "topic": topic,
        "topics_pool": topics,
        "rag_chunks_used": len(rag_context),
        **question_data,
    }


@router.post("/next-question")
@llm_limit
async def next_question(request: Request, req: NextQuestionRequest):
    req.topics = [t for t in (clean_subject(t, 200) for t in req.topics) if t]
    rag = build_rag(
        topics=req.topics,
        raw_chunks=req.raw_chunks,
        chunks_metadata=req.chunks_metadata,
        university=req.university,
        semester=req.semester,
        user_id=request.state.user_id,
    )

    topics = rag.get_all_topics() or req.topics or CS_SUBJECTS
    focus = None
    if req.last_result:
        focus = decide_follow_up(
            req.last_result.score, req.last_result.claims, req.last_result.weak_areas,
            req.last_was_follow_up, req.follow_ups_so_far, req.total_questions,
        )
    if focus:
        topic = req.last_result.topic or select_topic_for_question(topics, req.asked_topics, req.interview_type)
    else:
        topic = select_topic_for_question(topics, req.asked_topics, req.interview_type)
    difficulty = min(5 + req.question_number, 9)

    query = f"{req.interview_type} interview question about {topic} for {req.target_company} style company"
    rag_context = rag.retrieve(query, k=3)

    question_data = await generate_question(
        topic=topic,
        interview_type=req.interview_type,
        target_company=req.target_company,
        difficulty=difficulty,
        previous_questions=req.previous_questions,
        rag_context=rag_context,
        follow_up={"question": req.last_result.question, "focus": focus} if focus else None,
    )

    return {
        "question_number": req.question_number,
        "topic": topic,
        "is_follow_up": bool(focus),
        "rag_chunks_used": len(rag_context),
        **question_data,
    }


@router.post("/submit-answer")
@llm_limit
async def submit_answer(request: Request, req: SubmitAnswerRequest):
    # Syllabus chunks for the claim check come from the index already built for this session.
    rag = get_cached_rag(request.state.user_id)
    context_chunks = [c["text"] for c in rag.retrieve(f"{req.topic}: {req.question}", k=3)] if rag else []

    return await evaluate_answer(
        question=req.question,
        answer=req.answer,
        topic=req.topic,
        expected_keywords=req.expected_keywords,
        ideal_answer_hint=req.ideal_answer_hint,
        context_chunks=context_chunks,
    )


@router.post("/debrief")
@llm_limit
async def get_debrief(request: Request, req: DebriefRequest):
    return await generate_session_debrief({
        "questions": req.questions,
        "interview_type": req.interview_type,
        "target_company": req.target_company,
    })
