"""Session health route."""
from fastapi import APIRouter, Depends
from app.auth import get_current_user

router = APIRouter(prefix="/session", tags=["session"], dependencies=[Depends(get_current_user)])

# Health check stays public so uptime probes work without a token.
public_router = APIRouter(prefix="/session", tags=["session"])

@public_router.get("/health")
async def health():
    return {"status": "ok", "service": "prepwise-api", "version": "1.0.0"}
