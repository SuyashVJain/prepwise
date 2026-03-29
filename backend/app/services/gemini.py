# prepwise-api/app/services/gemini.py
from groq import Groq
from app.config import GROQ_API_KEY
import json

client = Groq(api_key=GROQ_API_KEY)


def call_llm(prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def clean_json(text: str) -> str:
    # strip markdown fences
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{") or part.startswith("["):
                return part
    # find JSON object directly
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text

async def generate_question(
    topic: str,
    interview_type: str,
    target_company: str,
    difficulty: int = 5,
    previous_questions: list[str] = [],
    rag_context: list[dict] = [],
) -> dict:
    prev = "\n".join(f"- {q}" for q in previous_questions) if previous_questions else "None"

    context_str = ""
    if rag_context:
        context_str = "\n\nRELEVANT SYLLABUS CONTENT (ground your question in this):\n"
        for i, chunk in enumerate(rag_context[:3]):
            context_str += f"\n[Context {i + 1}]: {chunk['text'][:400]}"

    type_instructions = {
        "technical": "Focus on deep conceptual understanding, time/space complexity, implementation trade-offs. Avoid trivial definitions.",
        "hr": "Use STAR format. Ask about teamwork, conflict resolution, leadership, or handling failure. Be specific.",
        "system_design": "Ask about designing a real-world system at scale. Include constraints like latency, availability, and cost.",
        "subject": "Ask a subject-specific question from the syllabus content provided. Be precise and academic.",
    }

    company_instructions = {
        "faang": "Style: LeetCode-hard conceptual, system design thinking, behavioral STAR. Google/Meta/Amazon style.",
        "product": "Style: Product sense + engineering, full-stack thinking, startup pragmatism. Razorpay/Zepto/CRED style.",
        "service": "Style: Moderate difficulty, aptitude-adjacent, clear definitions expected. TCS/Infosys/Wipro style.",
        "core": "Style: University exam level, theory-heavy, covers syllabus topics directly. Campus placement style.",
    }

    prompt = f"""You are Aria, a precise AI interview coach for Indian CS students.

Generate ONE interview question:
- Topic: {topic}
- Interview type: {interview_type} - {type_instructions.get(interview_type, '')}
- Company style: {target_company} - {company_instructions.get(target_company, '')}
- Difficulty (1-10): {difficulty}
- Do NOT repeat these: {prev}
{context_str}

Rules:
- Be specific and challenging, not generic
- If syllabus context is provided, reference actual concepts from it
- The question should take 3-5 minutes to answer well

Respond ONLY with valid JSON, no markdown, no extra text:
{{
  "question": "full question text here",
  "topic_tag": "specific subtopic (2-4 words)",
  "expected_keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "ideal_answer_hint": "what a strong answer must cover (1-2 sentences)"
}}"""

    text = call_llm(prompt)
    return json.loads(clean_json(text))


async def score_answer(
    question: str,
    answer: str,
    topic: str,
    expected_keywords: list[str],
    ideal_answer_hint: str,
) -> dict:
    if not answer or len(answer.strip()) < 15:
        return {
            "score": 0.0,
            "hint": "No meaningful answer provided. Always attempt the question even if unsure - partial credit is better than silence.",
            "ideal_answer": ideal_answer_hint,
            "weak_areas": [topic],
        }

    prompt = f"""You are Aria, a precise AI interview evaluator for Indian CS students.

Evaluate this answer honestly:

QUESTION: {question}
TOPIC: {topic}
STUDENT'S ANSWER: {answer}
EXPECTED KEYWORDS: {', '.join(expected_keywords)}
IDEAL ANSWER COVERS: {ideal_answer_hint}

Score on these dimensions (weighted equally):
1. Technical accuracy - is the content correct?
2. Depth - does it go beyond surface-level?
3. Clarity - is it well-structured and clear?
4. Keyword coverage - are key concepts mentioned?

Be strict but fair. A score of 7+ means genuinely good. 5-6 is adequate. Below 5 is weak.

Respond ONLY with valid JSON, no markdown, no extra text:
{{
  "score": <decimal 0.0-10.0>,
  "hint": "<2-3 sentences: what was done well AND what was missing>",
  "ideal_answer": "<complete ideal answer in 4-6 sentences>",
  "weak_areas": ["specific area 1", "specific area 2"]
}}"""

    text = call_llm(prompt, temperature=0.3)
    result = json.loads(clean_json(text))
    result["score"] = round(max(0.0, min(10.0, float(result.get("score", 5)))), 1)
    return result


async def generate_debrief(
    questions: list[dict],
    overall_score: float,
    interview_type: str,
    target_company: str,
) -> str:
    qa_summary = "\n".join([
        f"Q{i + 1} [{q.get('topic', '')}]: {q['question']}\nScore: {q['score']}/10 | Weak: {', '.join(q.get('weak_areas', []))}"
        for i, q in enumerate(questions)
    ])

    prompt = f"""You are Aria, an honest AI interview coach.

Write a post-interview debrief for this candidate:

Interview: {interview_type.upper()} | Target: {target_company.upper()} | Overall: {overall_score}/10

SESSION BREAKDOWN:
{qa_summary}

Write exactly 4 sentences:
1. Direct overall assessment - be honest, not sugarcoated
2. The strongest moment - what they did well
3. The most critical gap - what will cost them the job
4. One concrete action to take before their next session

Tone: Like a senior engineer who actually wants you to improve. Direct, specific, no corporate fluff.
Plain text only - no bullet points, no headers."""

    return call_llm(prompt, temperature=0.5, max_tokens=300)
