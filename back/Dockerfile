# ==============================================
# API Gateway - Production Dockerfile (FIXED)
# ==============================================

FROM node:20-alpine AS base

LABEL maintainer="OMR Akdemia"
LABEL description="OMR API Gateway Service"
LABEL version="1.0.0"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ==============================================
# Dependencies stage
# ==============================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json* ./packages/database/

RUN pnpm install --frozen-lockfile

# ==============================================
# Build stage
# ==============================================
FROM dependencies AS builder

COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database
COPY apps/api-gateway ./apps/api-gateway

# Build packages
RUN pnpm --filter @omr/shared-types build
RUN pnpm --filter @omr/database build || true
RUN mkdir -p packages/database/dist

# Build api-gateway
RUN pnpm --filter @omr/api-gateway build

# ==============================================
# Production dependencies stage
# ==============================================
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json* ./packages/database/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# ==============================================
# Production stage
# ==============================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/package.json ./package.json

# Copy shared packages dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./node_modules/@omr/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/package.json ./node_modules/@omr/shared-types/
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./node_modules/@omr/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./node_modules/@omr/database/

# Copy production node_modules (this includes @nestjs/core, etc.)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

USER nestjs

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/main.js"]