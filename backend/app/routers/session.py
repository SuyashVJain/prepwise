# backend/app/routers/session.py
from fastapi import APIRouter

router = APIRouter(prefix="/session", tags=["session"])

@router.get("/health")
async def health():
    return {"status": "ok", "service": "prepwise-api", "version": "1.0.0"}
