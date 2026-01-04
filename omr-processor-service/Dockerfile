# ==============================================
# OMR Processor Service - Production Dockerfile
# ==============================================

FROM python:3.11-slim AS base

# Metadata
LABEL maintainer="OMR Akdemia"
LABEL description="OMR Processing Service"
LABEL version="1.0.0"

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# ==============================================
# Dependencies stage
# ==============================================
FROM base AS dependencies

# Install system dependencies for OpenCV and utilities
# FIX: Reemplazado libgl1-mesa-glx por libgl1
RUN apt-get update && apt-get install -y --no-install-recommends \
    # OpenCV dependencies modernas
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    # Health check utilities
    curl \
    # Cleanup
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ==============================================
# Runtime stage
# ==============================================
FROM dependencies AS runtime

# Copy application code
COPY app ./app
COPY pyproject.toml* ./

# Create non-root user for security
RUN adduser --disabled-password --gecos "" --uid 1000 appuser \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]