"""FastAPI application: CORS, routers, health routes and optional voice model warm-up."""
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.config import FRONTEND_URL, VOICE_WARMUP
from app.limits import limiter, rate_limit_exceeded_handler
from app.routers import interview, syllabus, session, study, tutor, demo

def _warm_up_voice() -> None:
    """Load the speech models now, so the first tutor question does not pay for it."""
    from app.voice import factory

    started = time.perf_counter()
    try:
        stt = factory.describe(factory.get_stt())
        tts = factory.describe(factory.get_tts())
        print(f"voice: ready in {time.perf_counter() - started:.1f}s (speech-to-text: {stt['active']}, text-to-speech: {tts['active']})", flush=True)
    except Exception as e:
        print(f"voice: warm-up failed, models will load on first use ({type(e).__name__}: {e})", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if VOICE_WARMUP:
        # In the background: the API accepts requests while the models load.
        threading.Thread(target=_warm_up_voice, daemon=True).start()
    yield


app = FastAPI(title="Prepwise API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# FRONTEND_URL may hold several origins separated by commas, e.g. the production and a preview domain.
allowed_origins = ["http://localhost:3000", *(o.strip().rstrip("/") for o in FRONTEND_URL.split(",") if o.strip())]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(demo.router)
app.include_router(interview.router)
app.include_router(syllabus.router)
app.include_router(session.router)
app.include_router(session.public_router)
app.include_router(study.router)
app.include_router(tutor.router)
app.include_router(tutor.ws_router)

@app.get("/")
async def root():
    return {"status": "Prepwise API running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
