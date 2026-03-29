# prepwise-api/app/routers/interview.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.gemini import generate_question
from app.services.rag import select_topic_for_question, build_rag, CS_SUBJECTS
from app.services.scorer import evaluate_answer, generate_session_debrief

router = APIRouter(prefix="/interview", tags=["interview"])


class StartSessionRequest(BaseModel):
    university: str = ""
    semester: int = 5
    interview_type: str = "technical"
    target_company: str = "faang"
    total_questions: int = 10
    topics: list[str] = []
    raw_chunks: list[str] = []
    chunks_metadata: list[dict] = []


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


class SubmitAnswerRequest(BaseModel):
    question: str
    answer: str
    topic: str
    expected_keywords: list[str] = []
    ideal_answer_hint: str = ""


class DebriefRequest(BaseModel):
    questions: list[dict]
    interview_type: str
    target_company: str


@router.post("/start")
async def start_session(req: StartSessionRequest):
    rag = build_rag(
        topics=req.topics,
        raw_chunks=req.raw_chunks,
        chunks_metadata=req.chunks_metadata,
        university=req.university,
        semester=req.semester,
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
async def next_question(req: NextQuestionRequest):
    rag = build_rag(
        topics=req.topics,
        raw_chunks=req.raw_chunks,
        chunks_metadata=req.chunks_metadata,
        university=req.university,
        semester=req.semester,
    )

    topics = rag.get_all_topics() or req.topics or CS_SUBJECTS
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
    )

    return {
        "question_number": req.question_number,
        "topic": topic,
        "rag_chunks_used": len(rag_context),
        **question_data,
    }


@router.post("/submit-answer")
async def submit_answer(req: SubmitAnswerRequest):
    return await evaluate_answer(
        question=req.question,
        answer=req.answer,
        topic=req.topic,
        expected_keywords=req.expected_keywords,
        ideal_answer_hint=req.ideal_answer_hint,
    )


@router.post("/debrief")
async def get_debrief(req: DebriefRequest):
    return await generate_session_debrief({
        "questions": req.questions,
        "interview_type": req.interview_type,
        "target_company": req.target_company,
    })
