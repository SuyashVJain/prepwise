"""
Tutor session endpoint against the real app, with stand-in speech and LLM providers.

Run from the backend directory:  python -m unittest discover -s tests -t . -v
"""
import json
import time
import unittest
import uuid
from unittest import mock

from tests import offline_env

offline_env.apply()

from fastapi.testclient import TestClient  # noqa: E402
from starlette.websockets import WebSocketDisconnect  # noqa: E402

from app.main import app  # noqa: E402
from app.voice import factory  # noqa: E402
from app.voice.conversation import NOT_IN_DOCUMENTS  # noqa: E402
from app.voice.fakes import FakeLLM, FakeSTT, FakeTTS  # noqa: E402

client = TestClient(app)


def receive(ws):
    """Next frame as ('json', dict) or ('bytes', bytes)."""
    message = ws.receive()
    if message["type"] == "websocket.close":
        raise WebSocketDisconnect(message.get("code", 1000))
    if message.get("bytes") is not None:
        return "bytes", message["bytes"]
    return "json", json.loads(message["text"])


def collect_until(ws, kind):
    """Read frames until a JSON message of the given type; return (all json messages, all binary frames)."""
    events, blobs = [], []
    while True:
        frame, value = receive(ws)
        if frame == "bytes":
            blobs.append(value)
            continue
        events.append(value)
        if value["type"] == kind:
            return events, blobs
        if value["type"] == "error" and value.get("code") == "rate_limited":
            raise AssertionError(f"rate limited while waiting for {kind}")


def of(events, kind):
    return [e for e in events if e["type"] == kind]


class TutorSocketTests(unittest.TestCase):
    def setUp(self):
        self.llm, self.stt, self.tts = FakeLLM(), FakeSTT("what is a stack"), FakeTTS()
        patches = [
            mock.patch.object(factory, "get_llm", lambda: self.llm),
            mock.patch.object(factory, "get_stt", lambda: self.stt),
            mock.patch.object(factory, "get_tts", lambda hinglish=False: self.tts),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        # A fresh user per test keeps rate-limit counters apart.
        self.user = f"user-{uuid.uuid4().hex[:8]}"

    def connect(self, start=None, token=None):
        ws = client.websocket_connect("/tutor/ws").__enter__()
        self.addCleanup(lambda: ws.__exit__(None, None, None))
        ws.send_json({"type": "auth", "token": token or offline_env.token(self.user)})
        self.assertEqual(receive(ws)[1]["type"], "authenticated")
        if start is not None:
            ws.send_json({"type": "start", **start})
            collect_until(ws, "ready")
        return ws

    # ── auth ──

    def test_valid_token_is_accepted(self):
        ws = self.connect()
        ws.send_json({"type": "start", "subject": "DSA", "topic": "Stacks"})
        events, _ = collect_until(ws, "ready")
        self.assertEqual(events[-1]["topic"], "Stacks")
        self.assertEqual(events[-1]["mode"], "standalone")

    def test_no_token_is_rejected(self):
        with client.websocket_connect("/tutor/ws") as ws:
            ws.send_json({"type": "start", "subject": "DSA"})
            kind, event = receive(ws)
            self.assertEqual((event["type"], event["code"]), ("error", "unauthorized"))
            with self.assertRaises(WebSocketDisconnect) as closed:
                receive(ws)
            self.assertEqual(closed.exception.code, 4401)

    def test_garbage_token_is_rejected(self):
        with client.websocket_connect("/tutor/ws") as ws:
            ws.send_json({"type": "auth", "token": "garbage"})
            self.assertEqual(receive(ws)[1]["code"], "unauthorized")
            with self.assertRaises(WebSocketDisconnect):
                receive(ws)

    def test_expired_token_is_rejected(self):
        with client.websocket_connect("/tutor/ws") as ws:
            ws.send_json({"type": "auth", "token": offline_env.token(self.user, expires_in=-60)})
            self.assertEqual(receive(ws)[1]["code"], "unauthorized")

    def test_config_route_needs_a_token(self):
        self.assertEqual(client.get("/tutor/config").status_code, 401)
        ok = client.get("/tutor/config", headers={"Authorization": f"Bearer {offline_env.token(self.user)}"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["tts"]["active"], "fake-tts")

    # ── turns ──

    def test_text_turn_streams_sentences_then_audio(self):
        ws = self.connect({"subject": "DSA", "topic": "Stacks"})
        ws.send_json({"type": "user_text", "text": "What is a stack?"})
        events, blobs = collect_until(ws, "turn_end")
        self.assertEqual(of(events, "transcript")[0]["text"], "What is a stack?")
        self.assertEqual([e["seq"] for e in of(events, "sentence")], [1, 2, 3, 4])
        self.assertEqual(len(of(events, "audio")), 4)
        self.assertEqual(len(blobs), 4)
        self.assertTrue(all(b.startswith(b"RIFF") for b in blobs))
        states = [e["value"] for e in of(events, "state")]
        self.assertEqual(states[:2], ["thinking", "speaking"])
        self.assertFalse(events[-1]["cancelled"])
        self.assertIn("Current topic: Stacks", self.llm.prompts[0])

    def test_audio_turn_is_transcribed_first(self):
        ws = self.connect({"subject": "DSA"})
        ws.send_json({"type": "user_audio", "mime": "audio/webm"})
        ws.send_bytes(b"\x00" * 2000)
        events, _ = collect_until(ws, "turn_end")
        self.assertEqual(of(events, "transcript")[0], {"type": "transcript", "role": "student", "text": "what is a stack"})
        self.assertEqual(self.stt.calls, 1)
        self.assertEqual(len(of(events, "sentence")), 4)

    def test_silent_audio_reports_not_heard(self):
        self.stt.text = ""
        ws = self.connect({})
        ws.send_json({"type": "user_audio", "mime": "audio/webm"})
        ws.send_bytes(b"\x00" * 100)
        events, _ = collect_until(ws, "error")
        self.assertEqual(events[-1]["code"], "not_heard")
        self.assertEqual(self.llm.prompts, [])

    def test_history_carries_into_the_next_turn(self):
        ws = self.connect({"topic": "Stacks"})
        for text in ("What is a stack?", "And a queue?"):
            ws.send_json({"type": "user_text", "text": text})
            collect_until(ws, "turn_end")
        self.assertIn("Student: What is a stack?", self.llm.prompts[1])
        self.assertIn("Aria: A stack is a pile", self.llm.prompts[1])

    def test_greeting_does_not_call_the_model(self):
        ws = self.connect()
        ws.send_json({"type": "start", "topic": "Recursion", "greet": True})
        events, blobs = collect_until(ws, "turn_end")
        self.assertIn("Recursion", of(events, "sentence")[0]["text"])
        self.assertEqual(self.llm.prompts, [])
        self.assertEqual(len(blobs), 1)

    def test_text_only_session_sends_no_audio(self):
        ws = self.connect({"speak": False})
        ws.send_json({"type": "user_text", "text": "What is a stack?"})
        events, blobs = collect_until(ws, "turn_end")
        self.assertEqual(blobs, [])
        self.assertEqual(len(of(events, "sentence")), 4)

    # ── barge-in ──

    def test_cancel_stops_the_reply_in_flight(self):
        self.llm.delay = 0.05
        ws = self.connect({"topic": "Stacks"})
        ws.send_json({"type": "user_text", "text": "What is a stack?"})
        collect_until(ws, "sentence")
        started = time.perf_counter()
        ws.send_json({"type": "cancel"})
        events, _ = collect_until(ws, "turn_end")
        self.assertTrue(events[-1]["cancelled"])
        self.assertLess(time.perf_counter() - started, 1.0)
        self.assertLess(len(events[-1]["text"].split()), 41)

    def test_new_message_interrupts_the_previous_turn(self):
        self.llm.delay = 0.05
        ws = self.connect({"topic": "Stacks"})
        ws.send_json({"type": "user_text", "text": "What is a stack?"})
        collect_until(ws, "sentence")
        self.llm.delay = 0
        ws.send_json({"type": "user_text", "text": "Wait, what is a queue?"})
        first, _ = collect_until(ws, "turn_end")
        self.assertTrue(first[-1]["cancelled"])
        second, _ = collect_until(ws, "turn_end")
        self.assertFalse(second[-1]["cancelled"])
        self.assertEqual(second[-1]["turn"], first[-1]["turn"] + 1)

    # ── rate limit ──

    def test_turn_over_the_limit_is_rate_limited(self):
        ws = self.connect({"speak": False})
        for i in range(offline_env.TUTOR_TURNS_PER_MINUTE):
            ws.send_json({"type": "user_text", "text": f"question {i}"})
            events, _ = collect_until(ws, "turn_end")
            self.assertEqual(of(events, "error"), [])
        ws.send_json({"type": "user_text", "text": "one too many"})
        events, _ = collect_until(ws, "error")
        self.assertEqual(events[-1], {"type": "error", "code": "rate_limited", "message": "Too many requests. Please wait a moment."})
        self.assertEqual(len(self.llm.prompts), offline_env.TUTOR_TURNS_PER_MINUTE)

    def test_another_user_is_not_affected_by_the_limit(self):
        ws = self.connect({"speak": False})
        limit = offline_env.TUTOR_TURNS_PER_MINUTE
        for i in range(limit + 1):
            ws.send_json({"type": "user_text", "text": f"question {i}"})
            collect_until(ws, "error" if i == limit else "turn_end")
        self.user = f"user-{uuid.uuid4().hex[:8]}"
        other = self.connect({"speak": False})
        other.send_json({"type": "user_text", "text": "hello"})
        events, _ = collect_until(other, "turn_end")
        self.assertEqual(of(events, "error"), [])

    # ── documents mode ──

    SYLLABUS = {"topics": ["Operating Systems", "Database Management Systems"], "university": "X", "semester": 5}

    def test_documents_mode_answers_from_the_syllabus_with_citations(self):
        self.llm.reply = "Paging splits memory into fixed size frames. Each process gets pages mapped to frames."
        ws = self.connect()
        ws.send_json({"type": "start", "mode": "documents", "syllabus": self.SYLLABUS})
        ready, _ = collect_until(ws, "ready")
        self.assertTrue(ready[-1]["documents_loaded"])
        self.assertEqual(ready[-1]["chunks"], 10)
        ws.send_json({"type": "user_text", "text": "Tell me about operating systems"})
        events, _ = collect_until(ws, "turn_end")
        sources = of(events, "citations")[0]["sources"]
        self.assertGreaterEqual(len(sources), 1)
        self.assertEqual(sources[0]["topic"], "Operating Systems")
        self.assertIn("Answer ONLY from the syllabus excerpts", self.llm.prompts[0])
        self.assertIn("Operating Systems", self.llm.prompts[0])

    def test_documents_mode_refuses_when_the_answer_is_not_there(self):
        self.llm.reply = NOT_IN_DOCUMENTS
        ws = self.connect()
        ws.send_json({"type": "start", "mode": "documents", "syllabus": self.SYLLABUS})
        collect_until(ws, "ready")
        ws.send_json({"type": "user_text", "text": "Who won the cricket world cup?"})
        events, _ = collect_until(ws, "turn_end")
        self.assertTrue(events[-1]["refused"])
        self.assertIn("could not find that in your documents", events[-1]["text"])
        self.assertNotIn(NOT_IN_DOCUMENTS, json.dumps(events))
        self.assertEqual(of(events, "citations"), [])

    def test_documents_mode_without_documents_refuses_without_a_model_call(self):
        ws = self.connect()
        ws.send_json({"type": "start", "mode": "documents"})
        ready, _ = collect_until(ws, "ready")
        self.assertFalse(ready[-1]["documents_loaded"])
        ws.send_json({"type": "user_text", "text": "What is paging?"})
        events, _ = collect_until(ws, "turn_end")
        self.assertTrue(events[-1]["refused"])
        self.assertEqual(self.llm.prompts, [])

    def test_documents_are_scoped_to_the_user(self):
        ws = self.connect()
        ws.send_json({"type": "start", "mode": "documents", "syllabus": self.SYLLABUS})
        collect_until(ws, "ready")
        self.user = f"user-{uuid.uuid4().hex[:8]}"
        other = self.connect()
        other.send_json({"type": "start", "mode": "documents"})
        ready, _ = collect_until(other, "ready")
        self.assertFalse(ready[-1]["documents_loaded"], "one user's index must not be served to another")

    # ── bad input ──

    def test_unknown_message_type_reports_an_error(self):
        ws = self.connect({})
        ws.send_json({"type": "nonsense"})
        events, _ = collect_until(ws, "error")
        self.assertEqual(events[-1]["code"], "bad_message")


if __name__ == "__main__":
    unittest.main()
