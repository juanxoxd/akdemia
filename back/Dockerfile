# ==============================================
# API Gateway - Production Dockerfile
# ==============================================
#
# Backend NestJS para el sistema OMR
# Requiere: PostgreSQL, Redis, RabbitMQ, MinIO
#
# Build desde la raíz del monorepo (back/):
#   cd back && docker build -f Dockerfile.gateway -t api-gateway .
#
# ==============================================

FROM node:20-alpine AS base

# Metadata
LABEL maintainer="OMR Akdemia"
LABEL description="OMR API Gateway Service"
LABEL version="1.0.0"

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ==============================================
# Dependencies stage
# ==============================================
FROM base AS dependencies

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# Copy package.json files
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json* ./packages/database/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ==============================================
# Build stage
# ==============================================
FROM dependencies AS builder

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database
COPY apps/api-gateway ./apps/api-gateway

# Build packages first (shared-types, database)
RUN pnpm --filter @omr/shared-types build
RUN pnpm --filter @omr/database build || true

# Build api-gateway
RUN pnpm --filter @omr/api-gateway build

# ==============================================
# Production stage
# ==============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/package.json ./package.json

# Copy shared packages
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./node_modules/@omr/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/package.json ./node_modules/@omr/shared-types/

# Copy database package if exists
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./node_modules/@omr/database/dist 2>/dev/null || true
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./node_modules/@omr/database/ 2>/dev/null || true

# Copy node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

# Environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "dist/main.js"]
