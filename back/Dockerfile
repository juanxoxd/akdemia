# ==============================================
# API Gateway - Production Dockerfile
# ==============================================

FROM node:20-alpine AS base

LABEL maintainer="OMR Akdemia"
LABEL description="OMR API Gateway Service"
LABEL version="1.0.0"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ==============================================
# Dependencies stage - Install all deps for build
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
# Production stage - Use NPM for clean install
# ==============================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/dist ./dist

# Copy package.json and create a standalone version without workspace refs
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/package.json ./package.json.original

# Modify package.json to remove workspace references and install with npm
RUN cat package.json.original | \
    sed 's/"@omr\/shared-types": "workspace:\*"/"@omr\/shared-types": "file:\.\/packages\/shared-types"/g' | \
    sed 's/"@omr\/database": "workspace:\*"/"@omr\/database": "file:\.\/packages\/database"/g' > package.json

# Copy shared-types as local package
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/package.json ./packages/shared-types/

# Copy database as local package
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/

# Install production dependencies with npm (no symlinks issues)
RUN npm install --omit=dev --ignore-scripts

USER nestjs

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/main.js"]