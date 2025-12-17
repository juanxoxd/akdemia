"""Main FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.logging import setup_logging

logger = structlog.get_logger()

# Consumer global instance
consumer_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    global consumer_task
    
    setup_logging()
    logger.info(
        "Starting OMR Processor Service",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
    
    # Iniciar consumer de RabbitMQ en background
    if settings.ENABLE_CONSUMER:
        try:
            from app.consumers.processing_consumer import ProcessingConsumer
            consumer = ProcessingConsumer()
            await consumer.connect()
            consumer_task = asyncio.create_task(consumer.start_consuming())
            logger.info("Consumer de RabbitMQ iniciado")
        except Exception as e:
            logger.warning(f"No se pudo iniciar consumer de RabbitMQ: {e}")
    
    yield
    
    # Cleanup
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    
    logger.info("Shutting down OMR Processor Service")


app = FastAPI(
    title=settings.APP_NAME,
    description="Servicio de procesamiento de reconocimiento óptico de marcas (OMR)",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
