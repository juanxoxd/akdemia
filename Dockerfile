# ==============================================
# OMR Scanner App - Expo Web Dockerfile
# ==============================================
#
# Frontend React Native + Expo para web
#
# Build:
#   docker build -t omr-scanner-web .
#
# Run:
#   docker run -p 8081:8081 omr-scanner-web
#
# ==============================================

FROM node:20-alpine AS base

# Metadata
LABEL maintainer="OMR Akdemia"
LABEL description="OMR Scanner Web App"
LABEL version="1.0.0"

WORKDIR /app

# ==============================================
# Dependencies stage
# ==============================================
FROM base AS dependencies

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# ==============================================
# Build stage
# ==============================================
FROM dependencies AS builder

# Copy source code
COPY . .

# Build for web
RUN npx expo export --platform web

# ==============================================
# Production stage
# ==============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static files
RUN npm install -g serve

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expouser

# Copy built files
COPY --from=builder --chown=expouser:nodejs /app/dist ./dist

# Switch to non-root user
USER expouser

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/ || exit 1

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8081"]
