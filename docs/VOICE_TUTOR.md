# Prepwise — Voice Tutor

A tutor that teaches by talking. It lives at `/tutor`, linked from the sidebar and from Study Mode. The student picks a subject and topic, speaks or types, and can interrupt at any time. Subjects come from one shared list (`frontend/data/subjects.json`, copied to `backend/app/subjects.json`); the student can also choose Other and type any subject.

Two sources:

- **General knowledge** — the tutor teaches the topic from scratch.
- **Use my documents** — answers come only from the student's syllabus through the existing FAISS pipeline, with citations. If the answer is not in the documents, the tutor says so and does not guess.

---

## Architecture

```
browser (/tutor)                         backend (FastAPI)
┌──────────────────────────┐   WebSocket  ┌──────────────────────────────────────────┐
│ mic → voice detector     │──audio──────▶│ speech-to-text  (local Whisper | cloud)   │
│ text box                 │──text───────▶│ conversation    (last 8 messages + summary)│
│ transcript, state        │◀─sentences───│ LLM             (streamed, via call_llm)   │
│ Web Audio playback       │◀─audio───────│ sentence splitter → text-to-speech         │
└──────────────────────────┘              │                 (local Kokoro | cloud)     │
                                          └──────────────────────────────────────────┘
```

**One turn.** The student's audio is transcribed. The reply is streamed from the model; as soon as the first complete sentence exists it is sent to the browser as text and synthesized, while the rest is still being written. Sentences arrive and play in order, back to back.

**Barge-in.** When the student starts speaking (or presses STOP, or sends a new message), the browser stops playback at once and tells the server to cancel the reply in flight.

**Providers.** Each stage sits behind a small interface in `backend/app/voice/providers.py`, chosen by env var. A local provider that fails to load, or fails on a request, is replaced by the cloud one for the rest of the process, and the page shows which one is active.

| Stage | Local (default) | Cloud fallback |
|---|---|---|
| Speech-to-text | faster-whisper, `base`, int8, GPU if usable else CPU | Groq Whisper (`whisper-large-v3-turbo`) |
| LLM | — | Groq, whatever `LLM_MODEL` is set to |
| Text-to-speech | Kokoro (ONNX, CPU) | edge-tts, voice `en-IN-NeerjaNeural` |

### Files

| Path | Role |
|---|---|
| `backend/app/voice/providers.py` | Provider interfaces, local and cloud implementations, fallback wrapper |
| `backend/app/voice/factory.py` | Picks providers from env vars; reports which is active |
| `backend/app/voice/text.py` | Sentence splitter, clean-up of text before it is spoken |
| `backend/app/voice/conversation.py` | History window, running summary, prompts, Doubt Mode state, Hinglish |
| `backend/app/voice/pipeline.py` | One turn: stream, split, synthesize, cancel |
| `backend/app/voice/notes.py` | Session summary and flashcards |
| `backend/app/voice/code_review.py` | Python exercise review (code is never run) |
| `backend/app/services/videos.py` | YouTube search with a 24-hour cache |
| `backend/app/routers/tutor.py` | `/tutor/ws` session socket and the REST routes |
| `backend/scripts/voice_turn.py` | Command-line turn, no browser |
| `frontend/app/tutor/page.tsx` | The page |
| `frontend/lib/tutor/voiceClient.ts` | Socket, microphone, voice detector, gapless playback, barge-in |
| `frontend/components/tutor/` | Roadmap, videos, walkthrough, code and notes panels |
| `frontend/data/` | Subjects (the shared list), roadmaps, curated videos, walkthrough steps, Python exercises |

### Session socket

`/tutor/ws`. Browsers cannot set headers on a WebSocket, so the first message must be `{"type":"auth","token":"<Supabase access token>"}`. The token is checked the same way as on every other route; a missing or invalid one closes the socket with code 4401 and the page signs out. The token is never put in a URL.

Browser to server: `start`, `user_text`, `user_audio` (then one binary frame), `cancel`, `doubt`, `set`, `end`.
Server to browser: `authenticated`, `ready`, `providers`, `state`, `transcript`, `sentence`, `audio` (then one binary frame), `citations`, `doubt`, `turn_end`, `error`.

### REST routes (all need the usual bearer token)

| Route | Purpose | Limit |
|---|---|---|
| `GET /tutor/config` | Active speech providers | default |
| `GET /tutor/videos` | More videos for a topic | default |
| `POST /tutor/notes` | Summary and flashcards for a finished session (one model call) | LLM |
| `POST /tutor/code-check` | Review a Python exercise answer (one model call unless it is a syntax error) | LLM |

---

## Features

- **Four states** shown at all times: idle, listening, thinking, speaking. A live transcript shows both sides.
- **Hands-free** listening with an energy-based voice detector, **hold to talk** as the fallback, and a **text box** for browsers without a microphone or without permission.
- **Doubt Mode.** The "I didn't get that" button, or saying "wait" or "I did not get that", interrupts the tutor and re-explains the last point: first in simpler words, then with an analogy, then with a worked example.
- **Hinglish.** The tutor replies in Hindi and English mixed, in Roman script, with code and technical terms left in English.
- **Roadmap.** A hand-written, ordered topic list for Python, DSA, DBMS, OS and Computer Networks, shown as a checklist. Progress is kept in the browser.
- **Videos.** Hand-picked "Start here" cards plus a "More videos" list from the YouTube Data API. Cards open YouTube in a new tab; nothing is embedded.
- **Visual walkthroughs** (Python and DSA): list slicing, binary search, stack, linked-list insert, bubble sort. Hand-authored steps drawn in SVG.
- **Python code-along.** A plain editor with an exercise per Python topic. The answer is reviewed, not run.
- **Session notes.** Ending a session produces a short summary and 5 to 8 flashcards, with a copy button.
- **Mock interview hand-off.** The notes screen links to `/interview?topic=<topic>`, which starts a mock interview fixed on that topic.

---

## Environment variables

All optional. Defaults are shown; they are also listed in `backend/.env.example`.

| Variable | Default | Meaning |
|---|---|---|
| `VOICE_STT_PROVIDER` | `local` | `local` (falls back to cloud if it cannot load) or `cloud` |
| `VOICE_TTS_PROVIDER` | `local` | `local` (falls back to cloud) or `cloud` |
| `VOICE_STT_MODEL` | `base` | faster-whisper model size. `small` is more accurate but about three times slower on a CPU |
| `VOICE_STT_CLOUD_MODEL` | `whisper-large-v3-turbo` | Groq transcription model |
| `VOICE_TTS_VOICE` | `af_heart` | Kokoro voice |
| `VOICE_TTS_MODEL_FILE` | `kokoro-v1.0.int8.onnx` | Kokoro model file (`kokoro-v1.0.fp16.onnx` and `kokoro-v1.0.onnx` are larger) |
| `VOICE_TTS_CLOUD_VOICE` | `en-IN-NeerjaNeural` | edge-tts voice |
| `VOICE_MODEL_DIR` | `~/.cache/prepwise/voice` | Where speech models are cached, outside the repo |
| `RATE_LIMIT_TUTOR` | `20/minute` | Tutor turns per user |
| `YOUTUBE_API_KEY` | empty | YouTube Data API v3 key. Without it only the hand-picked videos show |

The tutor also uses `GROQ_API_KEY`, `LLM_MODEL` and `SUPABASE_URL`, already set for the rest of the app. The frontend needs nothing new: the socket address is derived from `NEXT_PUBLIC_API_URL`.

---

## Local versus cloud

| | Local | Cloud |
|---|---|---|
| Needs | `requirements-voice.txt`, about 600 MB of models on first run | Internet; Groq key for speech-to-text; nothing for edge-tts |
| Cost | Free, no request limits | Groq transcription requests count against the account |
| Privacy | Audio stays on the machine | Audio goes to Groq; text goes to the edge-tts service |
| Best for | A laptop demo, or any machine with a few GB of free RAM | Railway and other small servers |

On Railway, leave the voice requirements out. The app starts without them, the local providers fail to load, and the tutor uses the cloud providers automatically. Setting both provider variables to `cloud` skips the failed load attempt.

Hinglish always uses the cloud voice, even when `VOICE_TTS_PROVIDER=local`: the local English voice mispronounces Roman-script Hindi.

---

## Windows setup

From the repo root, in PowerShell:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-voice.txt
uvicorn app.main:app --port 8000
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

If `npm run dev` picks a port other than 3000, start the backend with `FRONTEND_URL` set to that address (for example `$env:FRONTEND_URL="http://localhost:3001"`), otherwise the browser's calls are blocked.

**First run.** The speech models download the first time the tutor is used: Whisper `base` (about 145 MB) and Kokoro (about 120 MB), into `%USERPROFILE%\.cache\prepwise\voice`. Running the command-line script once (below) downloads them ahead of time.

**Is the GPU used?** Three ways to check:

1. `python -c "import ctranslate2; print(ctranslate2.get_cuda_device_count())"` prints `1` when the card is visible.
2. The page header and `GET /tutor/config` show the active provider: `local-whisper-base-cuda` means GPU, `local-whisper-base-cpu` means CPU.
3. The backend log prints `GPU transcription failed (...) switching whisper to CPU` when it gives up on the GPU.

Seeing the card is not enough: GPU transcription also needs the CUDA 12 cuBLAS and cuDNN libraries. If the log says `cublas64_12.dll is not found`, install them into the venv:

```powershell
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
```

The backend looks for these inside the venv on start-up. This path is written but has not been tried on a machine with the libraries installed. Text-to-speech runs on the CPU either way.

---

## Command-line script

Run from `backend/` with the venv active. Each turn makes one model call.

```powershell
python -m scripts.voice_turn --text "What is a stack?" --subject DSA --topic "Stacks and queues"
python -m scripts.voice_turn --audio question.wav
python -m scripts.voice_turn --text "Stack kya hota hai?" --hinglish
python -m scripts.voice_turn --text "What is a stack?" --fake
```

`--fake` uses stand-in providers: no network, no models, no model call. The script prints the active providers, the transcript, and the time to the first sentence, the first audio chunk and the whole reply. Audio chunks are written to a temporary folder (or `--out`).

## Tests

```powershell
cd backend
python -m unittest discover -s tests -t .
```

88 offline tests, no network and no speech models: sentence splitting, history trimming, provider fallback, cancellation, the session socket (valid, missing, garbage and expired tokens, rate limit, barge-in, documents mode, citations, refusal), Doubt Mode, Hinglish, notes, video search and caching, and the code review path (including a check that student code is never executed).

---

## Measured on the development laptop

RTX 3050 Laptop (4 GB), Windows, GPU libraries not installed, so everything below ran on the CPU.

| Measurement | Result |
|---|---|
| Model's first complete sentence | about 1.1 s |
| First audio chunk (text question) | about 2.0 s |
| Whole reply synthesized (about 100 words, 40 s of speech) | about 12 s |
| Kokoro synthesis speed | about 3 times faster than real time |
| Whisper `small` on CPU, 4-second question | about 2.0 s |
| Whisper `base` on CPU, same question | about 0.65 s |
| Cloud speech-to-text, same question | about 1.0 s |
| Cloud text-to-speech, one short sentence | about 1.7 s |

For a spoken question, add the transcription time to the first-audio time: about 2.7 s with `base` (the default) on CPU, about 4 s with `small`.

---

## Limits

- **Groq account limits** are shared with interview scoring: 8,000 tokens per minute and 1,000 requests per day on the current key. A tutor turn is one model call of roughly 500 to 900 tokens, so several students talking at once will hit the per-minute limit.
- **Replies are capped** at 60 to 120 spoken words. Only the last 8 messages go to the model in full; older ones are folded into a short summary built without a model call.
- **Per-user limit:** 20 tutor turns a minute (`RATE_LIMIT_TUTOR`). Notes and code review count against the interview `RATE_LIMIT_LLM` budget.
- **Audio clips** are limited to 5 MB and typed messages to 2,000 characters.
- **YouTube search** costs 100 quota units of the default 10,000 a day. Results are cached for 24 hours per subject and topic, in memory.

## Known gaps

- **Python code is reviewed, not run.** Running untrusted code safely needs network isolation and hard CPU and memory limits. On Windows those are not available without administrator set-up, so the tutor parses the code for syntax errors and has the model read it. The review can be wrong about whether code works. Real execution belongs in a separate container with no network, never in the API process.
- **GPU transcription is untested.** The CUDA libraries are not installed on the development laptop, so speech-to-text ran on the CPU.
- **Hinglish audio has not been listened to.** The cloud voice produces audio for Hinglish text; how natural it sounds is unchecked. Whisper may also write spoken Hindi in Devanagari.
- **Hands-free listening can be interrupted by the speakers.** The detector raises its threshold while the tutor is talking, and the browser's echo cancellation helps, but headphones are the reliable answer. Hold to talk always works.
- **No reconnect in the middle of a session.** If the connection drops, the page offers a reconnect button and the conversation starts again.
- **Notes are not saved to the account yet.** Apply `docs/migrations/tutor_notes.sql` to turn that on. Until then notes live in the browser tab.
- **Documents mode uses the onboarding syllabus only.** Study Mode uploads exist only in the browser and are not available to the tutor.
- **A preset-topic mock interview is not grounded in the syllabus.** The topic is sent alone so every question stays on it.
- **Curated videos are placeholders.** Fill the `TODO` entries in `frontend/data/curated-videos.json`.
- **Counters and caches are in memory.** Rate limits, the video cache and the per-user index cache reset on restart and are not shared between instances.
- **The layout is desktop only**, like the rest of the app. Tested in Edge; Chrome uses the same engine. Other browsers fall back to typing if they cannot record.

## Subjects

- The shared list has Python, DSA, DBMS, Operating Systems, Computer Networks, OOP, System Design, Theory of Computation, Compilers, Machine Learning and Software Engineering. The ids `python`, `dsa`, `dbms`, `os` and `cn` are unchanged.
- Every subject has suggested topic chips. A roadmap exists for each one (`frontend/data/tutor-roadmaps.json`, keyed by subject id). If a subject has no roadmap, the roadmap block and tab are hidden and only the topic chips show.
- Walkthroughs (Python and DSA) and the Python code-along stay limited to those subjects. Curated videos are keyed by subject id; the YouTube search uses the subject name.
- **Other.** The student types a subject (up to 60 characters). It is sent as the session's `subject`, so the tutor, notes and video search work without a roadmap. The backend removes control characters and markup characters and caps the length (`clean_subject` in `backend/app/subjects.py`). The same typed subject can be used for a Subject-Specific interview. Existing rate limits apply.
