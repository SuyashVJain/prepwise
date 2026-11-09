"""Voice tutor routes and the WebSocket session."""
import asyncio
import json
from typing import Iterator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.auth import get_current_user, verify_access_token
from app.limits import default_limit, llm_limit, tutor_turn_allowed
from app.services.rag import build_rag, get_cached_rag
from app.services.videos import search_videos
from app.voice import factory
from app.voice.code_review import MAX_CODE_CHARS, review_code
from app.voice.conversation import NOT_IN_DOCUMENTS, NOTHING_TO_REEXPLAIN, REFUSAL_TEXT, Conversation, is_doubt_trigger
from app.voice.notes import NotEnoughToSummarise, make_notes
from app.voice.pipeline import run_turn
from app.voice.providers import LLMProvider

router = APIRouter(prefix="/tutor", tags=["tutor"], dependencies=[Depends(get_current_user)])
# WebSocket routes cannot use the header-based dependency; the socket authenticates in its first message.
ws_router = APIRouter(prefix="/tutor", tags=["tutor"])

MAX_TEXT_CHARS = 2000
MAX_AUDIO_BYTES = 5 * 1024 * 1024
AUTH_TIMEOUT_SECONDS = 10
RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment."
UNAUTHORIZED_CLOSE_CODE = 4401


@router.get("/config")
@default_limit
async def tutor_config(request: Request):
    """Which speech providers are active. Loads them on first call."""
    stt = await asyncio.to_thread(factory.describe, factory.get_stt())
    tts = await asyncio.to_thread(factory.describe, factory.get_tts())
    return {"stt": stt, "tts": tts}


@router.get("/videos")
@default_limit
async def tutor_videos(request: Request, subject: str = "", topic: str = "", exclude: str = ""):
    """More videos for a topic. `exclude` is a comma-separated list of video ids already shown as hand-picked."""
    exclude_ids = [v for v in exclude.split(",") if v][:50]
    return await asyncio.to_thread(search_videos, subject[:80], topic[:120], exclude_ids)


class NotesMessage(BaseModel):
    role: str
    text: str


class NotesRequest(BaseModel):
    subject: str = ""
    topic: str = ""
    transcript: list[NotesMessage] = []


@router.post("/notes")
@llm_limit
async def tutor_notes(request: Request, req: NotesRequest):
    """A short summary and flashcards for a finished session. One LLM call."""
    transcript = [m.model_dump() for m in req.transcript]
    try:
        return await asyncio.to_thread(make_notes, transcript, req.subject[:80], req.topic[:120])
    except NotEnoughToSummarise as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=502, detail="Could not write notes for this session. Try again.")


class CodeCheckRequest(BaseModel):
    exercise: str = ""
    code: str = ""


@router.post("/code-check")
@llm_limit
async def tutor_code_check(request: Request, req: CodeCheckRequest):
    """Review a Python exercise answer. The code is parsed and read; it is never executed."""
    if len(req.code) > MAX_CODE_CHARS:
        raise HTTPException(status_code=400, detail=f"Code is too long. Keep it under {MAX_CODE_CHARS} characters.")
    try:
        return await asyncio.to_thread(review_code, req.exercise[:1000], req.code)
    except ValueError:
        raise HTTPException(status_code=502, detail="Could not check the code. Try again.")


class _Scripted(LLMProvider):
    """Speaks a fixed line through the normal pipeline, without a model call."""

    name = "scripted"

    def __init__(self, text: str):
        self._text = text

    def stream(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> Iterator[str]:
        yield self._text

    def complete(self, prompt: str, max_tokens: int = 500, temperature: float = 0.6) -> str:
        return self._text


class TutorSession:
    """One student's live tutor conversation over a WebSocket."""

    def __init__(self, ws: WebSocket, user_id: str):
        self.ws = ws
        self.user_id = user_id
        self.conversation = Conversation()
        self.rag = None
        self.speak = True
        self.turn_id = 0
        self._task: Optional[asyncio.Task] = None
        self._cancel = asyncio.Event()
        self._send_lock = asyncio.Lock()

    # ── sending ──

    async def send(self, event: dict, audio: Optional[bytes] = None) -> None:
        # An audio event is a JSON header followed by one binary frame; keep the pair together.
        async with self._send_lock:
            await self.ws.send_text(json.dumps(event))
            if audio is not None:
                await self.ws.send_bytes(audio)

    async def error(self, code: str, message: str) -> None:
        await self.send({"type": "error", "code": code, "message": message})

    # ── turn control ──

    async def cancel_turn(self) -> None:
        """Barge-in: stop generation and speech for the turn in flight."""
        if self._task and not self._task.done():
            self._cancel.set()
            await asyncio.gather(self._task, return_exceptions=True)
        self._task = None

    async def start_turn(self, text: str, scripted: Optional[str] = None, doubt: bool = False) -> None:
        await self.cancel_turn()
        self._cancel = asyncio.Event()
        self._task = asyncio.create_task(self._run_turn(text, scripted, self._cancel, doubt))

    def _tts(self):
        return factory.get_tts(self.conversation.hinglish) if self.speak else None

    async def _run_turn(self, text: str, scripted: Optional[str], cancel: asyncio.Event, doubt: bool = False) -> None:
        self.turn_id += 1
        turn = self.turn_id
        try:
            if scripted is None and not tutor_turn_allowed(self.user_id):
                await self.error("rate_limited", RATE_LIMIT_MESSAGE)
                await self.send({"type": "state", "value": "idle"})
                return

            await self.send({"type": "state", "value": "thinking", "turn": turn})

            chunks: list[dict] = []
            llm = factory.get_llm()
            prompt = ""
            if scripted is not None:
                llm = _Scripted(scripted)
            elif doubt:
                # Re-explain the last point another way. It was already grounded, so no new retrieval.
                style, instruction = self.conversation.next_doubt_style()
                prompt = self.conversation.build_doubt_prompt(instruction, text)
                await self.send({"type": "doubt", "turn": turn, "style": style, "count": self.conversation.doubt_count})
            elif self.conversation.mode == "documents":
                if self.rag is not None:
                    query = f"{self.conversation.topic} {text}".strip()
                    chunks = await asyncio.to_thread(self.rag.retrieve, query, 4)
                if not chunks:
                    # Nothing to answer from: refuse without spending a model call.
                    llm = _Scripted(NOT_IN_DOCUMENTS)

            spoke = False

            async def emit(event: dict, audio: Optional[bytes]) -> None:
                nonlocal spoke
                if event["type"] == "sentence" and not spoke:
                    spoke = True
                    await self.send({"type": "state", "value": "speaking", "turn": turn})
                await self.send({**event, "turn": turn}, audio)

            documents = self.conversation.mode == "documents" and scripted is None and not doubt
            result = await run_turn(
                prompt or self.conversation.build_prompt(text, chunks),
                llm,
                await asyncio.to_thread(self._tts),
                emit,
                cancel,
                refusal_sentinel=NOT_IN_DOCUMENTS if documents else "",
                refusal_text=REFUSAL_TEXT,
            )

            if scripted is None:
                self.conversation.add("student", text or "I did not get that.")
            if result.text:
                if scripted is not None or result.refused:
                    self.conversation.add("tutor", result.text)
                else:
                    self.conversation.note_reply(result.text, was_doubt=doubt)

            if documents and not result.refused and not result.cancelled:
                await self.send({"type": "citations", "turn": turn, "sources": _citations(chunks)})

            await self.send({
                "type": "turn_end",
                "turn": turn,
                "cancelled": result.cancelled,
                "refused": result.refused,
                "text": result.text,
                "first_audio_ms": result.first_audio_ms,
                "total_ms": result.total_ms,
            })
        except (WebSocketDisconnect, RuntimeError):
            return  # the socket went away mid-turn
        except HTTPException as e:
            await self.error("llm_unavailable", str(e.detail))
        except Exception as e:
            print(f"tutor: turn failed ({type(e).__name__}: {e})")
            await self.error("turn_failed", "Something went wrong. Try again.")
        try:
            await self.send({"type": "state", "value": "idle"})
        except (WebSocketDisconnect, RuntimeError):
            pass

    # ── incoming messages ──

    async def on_start(self, msg: dict) -> None:
        await self.cancel_turn()
        mode = "documents" if msg.get("mode") == "documents" else "standalone"
        self.conversation = Conversation(
            mode=mode,
            subject=str(msg.get("subject") or "")[:80],
            topic=str(msg.get("topic") or "")[:120],
            hinglish=bool(msg.get("hinglish")),
        )
        self.speak = msg.get("speak", True) is not False
        self.rag = None

        if mode == "documents":
            syllabus = msg.get("syllabus") or {}
            raw_chunks = syllabus.get("raw_chunks") or []
            topics = syllabus.get("topics") or []
            if raw_chunks or topics:
                # Same per-user index and cache as the interview flow.
                self.rag = await asyncio.to_thread(
                    build_rag,
                    topics,
                    raw_chunks,
                    syllabus.get("chunks_metadata") or [],
                    str(syllabus.get("university") or ""),
                    int(syllabus.get("semester") or 0),
                    self.user_id,
                )
            else:
                self.rag = get_cached_rag(self.user_id)

        await self.send({
            "type": "ready",
            "mode": mode,
            "subject": self.conversation.subject,
            "topic": self.conversation.topic,
            "hinglish": self.conversation.hinglish,
            "documents_loaded": self.rag is not None,
            "chunks": len(self.rag.chunks) if self.rag is not None else 0,
        })
        asyncio.create_task(self._send_providers())

        if msg.get("greet"):
            focus = self.conversation.topic or self.conversation.subject
            greeting = f"Hi, I am Aria. What would you like to understand about {focus}?" if focus else \
                "Hi, I am Aria. What would you like to learn today?"
            await self.start_turn("", scripted=greeting)

    async def _send_providers(self) -> None:
        """Tell the frontend which speech providers ended up active (local, or the cloud fallback)."""
        try:
            stt = await asyncio.to_thread(factory.describe, factory.get_stt())
            tts = await asyncio.to_thread(factory.describe, factory.get_tts(self.conversation.hinglish))
            await self.send({"type": "providers", "stt": stt, "tts": tts})
        except Exception:
            pass

    async def on_text(self, text: str) -> None:
        text = text.strip()[:MAX_TEXT_CHARS]
        if not text:
            return
        await self.send({"type": "transcript", "role": "student", "text": text})
        # A spoken "wait" or "I did not get that" means: explain the last point again.
        if is_doubt_trigger(text) and self.conversation.last_point:
            await self.start_turn(text, doubt=True)
        else:
            await self.start_turn(text)

    async def on_doubt(self) -> None:
        """The doubt button: interrupt and explain the last point a different way."""
        if not self.conversation.last_point:
            await self.start_turn("", scripted=NOTHING_TO_REEXPLAIN)
            return
        await self.send({"type": "transcript", "role": "student", "text": "I did not get that."})
        await self.start_turn("", doubt=True)

    async def on_audio(self, audio: bytes, mime: str) -> None:
        await self.cancel_turn()
        if len(audio) > MAX_AUDIO_BYTES:
            await self.error("audio_too_large", "That recording is too long. Try a shorter question.")
            return
        await self.send({"type": "state", "value": "thinking"})
        try:
            language = None if self.conversation.hinglish else "en"
            text = await asyncio.to_thread(factory.get_stt().transcribe, audio, mime, language)
        except Exception as e:
            print(f"tutor: transcription failed ({type(e).__name__}: {e})")
            await self.error("stt_failed", "Could not transcribe that. Try again or type your question.")
            await self.send({"type": "state", "value": "idle"})
            return
        if not text.strip():
            await self.error("not_heard", "I did not catch that. Try again.")
            await self.send({"type": "state", "value": "idle"})
            return
        await self.on_text(text)

    async def run(self) -> None:
        pending_audio_mime: Optional[str] = None
        while True:
            message = await self.ws.receive()
            if message["type"] == "websocket.disconnect":
                break

            if message.get("bytes") is not None:
                if pending_audio_mime is not None:
                    mime, pending_audio_mime = pending_audio_mime, None
                    await self.on_audio(message["bytes"], mime)
                continue

            try:
                msg = json.loads(message.get("text") or "")
            except json.JSONDecodeError:
                await self.error("bad_message", "Message was not valid JSON.")
                continue
            kind = msg.get("type")

            if kind == "start":
                await self.on_start(msg)
            elif kind == "user_text":
                await self.on_text(str(msg.get("text") or ""))
            elif kind == "user_audio":
                pending_audio_mime = str(msg.get("mime") or "audio/webm")
            elif kind == "doubt":
                await self.on_doubt()
            elif kind == "cancel":
                await self.cancel_turn()
                await self.send({"type": "state", "value": "idle"})
            elif kind == "set":
                if "hinglish" in msg:
                    self.conversation.hinglish = bool(msg["hinglish"])
                    # The voice changes with the language, so report the active one again.
                    asyncio.create_task(self._send_providers())
                if "speak" in msg:
                    self.speak = bool(msg["speak"])
                if "topic" in msg:
                    self.conversation.topic = str(msg["topic"] or "")[:120]
            elif kind == "end":
                break
            else:
                await self.error("bad_message", f"Unknown message type: {kind}")
        await self.cancel_turn()


def _citations(chunks: list[dict]) -> list[dict]:
    sources = []
    for i, chunk in enumerate(chunks):
        meta = chunk.get("metadata") or {}
        sources.append({
            "n": i + 1,
            "topic": meta.get("topic") or meta.get("source") or "Syllabus",
            "page": meta.get("page"),
            "snippet": chunk["text"][:180],
        })
    return sources


@ws_router.websocket("/ws")
async def tutor_ws(ws: WebSocket):
    """
    Voice tutor session. The first message must be {"type": "auth", "token": "<Supabase access token>"};
    anything else, or an invalid token, closes the socket.
    """
    await ws.accept()
    try:
        first = await asyncio.wait_for(ws.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
        if not isinstance(first, dict) or first.get("type") != "auth" or not first.get("token"):
            raise HTTPException(status_code=401, detail="Missing token.")
        user_id = await asyncio.to_thread(verify_access_token, str(first["token"]))
    except WebSocketDisconnect:
        return
    except Exception as e:
        detail = e.detail if isinstance(e, HTTPException) else "Authentication failed."
        try:
            await ws.send_json({"type": "error", "code": "unauthorized", "message": str(detail)})
            await ws.close(code=UNAUTHORIZED_CLOSE_CODE)
        except RuntimeError:
            pass
        return

    session = TutorSession(ws, user_id)
    await session.send({"type": "authenticated"})
    try:
        await session.run()
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        await session.cancel_turn()
        try:
            await ws.close()
        except RuntimeError:
            pass
