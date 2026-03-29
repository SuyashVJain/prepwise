from app.services.gemini import score_answer, generate_debrief
from collections import Counter


async def evaluate_answer(
    question: str,
    answer: str,
    topic: str,
    expected_keywords: list[str],
    ideal_answer_hint: str,
) -> dict:
    result = await score_answer(
        question=question,
        answer=answer,
        topic=topic,
        expected_keywords=expected_keywords,
        ideal_answer_hint=ideal_answer_hint,
    )
    result["score"] = max(0.0, min(10.0, float(result.get("score", 5))))
    return result


async def generate_session_debrief(session_data: dict) -> dict:
    questions = session_data.get("questions", [])
    if not questions:
        return {
            "debrief": "No questions were answered in this session.",
            "avg_score": 0.0,
            "weak_topics": [],
            "total_questions": 0,
            "scores": [],
        }

    scores = [float(q.get("score", 0)) for q in questions]
    avg_score = round(sum(scores) / len(scores), 1)

    all_weak = []
    for q in questions:
        all_weak.extend(q.get("weak_areas", []))

    weak_counter = Counter(all_weak)
    top_weak = [area for area, _ in weak_counter.most_common(5)]

    debrief_text = await generate_debrief(
        questions=questions,
        overall_score=avg_score,
        interview_type=session_data.get("interview_type", "technical"),
        target_company=session_data.get("target_company", "general"),
    )

    return {
        "debrief": debrief_text,
        "avg_score": avg_score,
        "weak_topics": top_weak,
        "total_questions": len(questions),
        "scores": scores,
    }
