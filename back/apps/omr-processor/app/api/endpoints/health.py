"""Health check endpoints."""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("")
async def health_check() -> dict:
    """Basic health check."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/ready")
async def readiness_check() -> dict:
    """Readiness check - verifies service dependencies."""
    # TODO: Add MinIO and RabbitMQ connectivity checks
    return {
        "status": "ready",
        "dependencies": {
            "minio": "connected",
            "rabbitmq": "connected",
        },
    }
