# prepwise-api/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.routers import interview, syllabus, session, study

app = FastAPI(title="Prepwise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://prepwise-mocha.vercel.app",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview.router)
app.include_router(syllabus.router)
app.include_router(session.router)
app.include_router(study.router)

@app.get("/")
async def root():
    return {"status": "Prepwise API running", "version": "1.0.0"}