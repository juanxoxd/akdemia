"""API routes."""

from fastapi import APIRouter

from app.api.endpoints import health, processing

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(processing.router, prefix="/processing", tags=["processing"])
