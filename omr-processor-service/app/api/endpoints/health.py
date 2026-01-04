"""Health check endpoints."""

import aio_pika
import httpx
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
    minio_status = "disconnected"
    rabbitmq_status = "disconnected"
    overall_status = "not_ready"
    
    # Check MinIO connectivity
    try:
        minio_url = f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}/minio/health/live"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(minio_url)
            if response.status_code == 200:
                minio_status = "connected"
    except Exception:
        # Try alternative health endpoint
        try:
            minio_url = f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.head(minio_url)
                if response.status_code in [200, 403]:  # 403 means it's running but needs auth
                    minio_status = "connected"
        except Exception:
            minio_status = "disconnected"
    
    # Check RabbitMQ connectivity
    try:
        connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            timeout=5
        )
        await connection.close()
        rabbitmq_status = "connected"
    except Exception:
        rabbitmq_status = "disconnected"
    
    # Determine overall status
    if minio_status == "connected" and rabbitmq_status == "connected":
        overall_status = "ready"
    elif minio_status == "connected" or rabbitmq_status == "connected":
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "dependencies": {
            "minio": minio_status,
            "rabbitmq": rabbitmq_status,
        },
    }

