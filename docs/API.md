# API reference

Base URL: the backend service, for example `http://localhost:8000`. Interactive docs are served at `/docs` when the service is running.

**Authentication.** Every route except `/` and `/health` needs `Authorization: Bearer <Supabase access token>`. A missing or invalid token returns `401`. The WebSocket sends the token in its first message instead (see below).

**Rate limits.** Limits are per signed-in user and shared by route group. Values are defaults and can be changed with environment variables. When a limit is hit the API returns `429` with a `Retry-After` header and `{"detail": "Too many requests. Please wait a moment."}`.

| Group | Default | Variable |
|---|---|---|
| Model calls (`llm`) | 30 per minute | `RATE_LIMIT_LLM` |
| Uploads (`upload`) | 10 per minute | `RATE_LIMIT_UPLOAD` |
| Everything else (`default`) | 120 per minute | `RATE_LIMIT_DEFAULT` |
| Voice tutor turns | 20 per minute | `RATE_LIMIT_TUTOR` |

## Health

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/` | none | `{"status": "Prepwise API running", "version": "1.0.0"}` |
| GET | `/health` | none | `{"status": "ok"}` |
| GET | `/session/health` | yes | `{"status": "ok", "service": "prepwise-api", "version": "1.0.0"}` |

## Demo

Public routes behind the landing page's "Try one question" box. No sign-in, nothing is stored, and only counts are kept in memory.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/demo/questions` | none | `[{"id", "question"}]` for the three fixed sample questions |
| POST | `/demo/check` | none | The same scoring result as `/interview/submit-answer` (`score`, `hint`, `claims`, `ideal_answer`) plus `question` |

`POST /demo/check` takes `{"question_id": "dijkstra" | "tcp_udp" | "normalisation", "answer": "<20 to 600 characters>"}`. The question and its hint are fixed on the server. A bad id or length returns `422 {"message"}`. When a limit is reached it returns `429 {"limited": true, "message": "The demo is busy, sign up to continue."}`. If the model call fails it returns `503 {"message"}`.

Limits: 3 per minute and 10 per day per client address, plus a shared cap of 150 per day and 6 per minute across all visitors, so the model quota is never used up. The caps reset when the process restarts.

## Interview

All four routes use the `llm` limit.

### `POST /interview/start`
Builds the retrieval index from the syllabus and returns the first question.

Request: `university`, `semester`, `interview_type` (`technical`, `hr`, `system_design`, `subject`), `target_company` (`faang`, `product`, `service`, `core`), `total_questions`, `topics` (list), `raw_chunks` (list of text), `chunks_metadata` (list, the stored vectors).

Response: `question_number`, `total_questions`, `topic`, `topics_pool`, `rag_chunks_used`, and the question fields `question`, `topic_tag`, `expected_keywords`, `ideal_answer_hint`.

### `POST /interview/next-question`
Returns the next question, or a follow-up on the previous answer.

Request: the syllabus fields above plus `asked_topics`, `previous_questions`, `question_number`, and for the follow-up decision `last_result` (`question`, `topic`, `score`, `weak_areas`, `claims`), `last_was_follow_up`, `follow_ups_so_far`, `total_questions`.

Response: `question_number`, `topic`, `is_follow_up`, `rag_chunks_used` and the question fields.

### `POST /interview/submit-answer`
Checks the claims in an answer and scores it.

Request: `question`, `answer`, `topic` (required); `expected_keywords`, `ideal_answer_hint`, `time_taken_seconds` (optional, recorded for pacing only).

Response: `score` (0 to 10), `hint`, `ideal_answer`, `weak_areas`, and `claims`, a list of `{claim, verdict, critical, confidence, reason}`. `claims` is absent when the single-prompt fallback was used. An answer under 15 characters scores 0 without a model call.

### `POST /interview/debrief`
Request: `questions` (list of `{question, score, weak_areas, topic}`), `interview_type`, `target_company`.

Response: `debrief` (text), `avg_score`, `weak_topics`, `total_questions`, `scores`.

## Syllabus

### `POST /syllabus/upload` (upload limit)
Multipart form with `file` (PDF). Response: `success`, `topics`, `topic_count`, `chunk_count`, `raw_chunks`, `metadata`.

### `POST /syllabus/manual` (default limit)
Request: `topics` (list, required), `university`, `semester`. Response: same shape as upload.

### `GET /syllabus/subjects` (default limit)
Response: `{"subjects": [...]}` the built-in list of computer science subjects.

## Study mode

### `POST /study/upload` (upload limit)
Multipart form with `file` (PDF, DOCX or TXT). Response: `success`, `filename`, `text` (first 50,000 characters), `chunks`, `word_count`, `chunk_count`, `truncated`.

### `POST /study/chat` (llm limit)
Request: `message` (required), `chunks`, `document_text`, `history`. Response: `response`, `sources_used`.

### `POST /study/quiz` (llm limit)
Request: `chunks` or `document_text`, `num_questions`, `difficulty`. Response: the generated multiple-choice questions.

## Voice tutor

### `GET /tutor/config` (default limit)
Which speech providers are active: `{"stt": {...}, "tts": {...}}`, each with `active`, `fell_back` and `reason`.

### `GET /tutor/videos` (default limit)
Query: `subject`, `topic`, `exclude` (comma-separated video ids). Response: suggested videos, or an empty list when no key is configured.

### `POST /tutor/notes` (llm limit)
Request: `subject`, `topic`, `transcript` (list of `{role, text}`). Response: a summary and flashcards. Returns `400` when the conversation is too short.

### `POST /tutor/code-check` (llm limit)
Request: `exercise`, `code`. Response: a short review of the student's Python code.

### `WS /tutor/ws`
Voice session. The first message must be `{"type": "auth", "token": "<access token>"}`, otherwise the socket closes with code `4401`. After `{"type": "authenticated"}` the browser sends audio and text messages and receives `state`, `transcript`, `turn_end`, `citations`, `doubt`, `providers` and `error` messages. The message types and limits are described in [VOICE_TUTOR.md](VOICE_TUTOR.md).

## Errors

| Status | Meaning |
|---|---|
| 401 | Missing, expired or invalid token |
| 400 | The request cannot be used, for example a conversation too short for notes, an unsupported file or a file that is too large |
| 422 | The request body failed validation |
| 429 | Rate limit reached, see `Retry-After` |
| 503 | The language model key is not configured on the server |
