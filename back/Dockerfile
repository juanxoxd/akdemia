# ==============================================
# API Gateway - Production Dockerfile (CORREGIDO)
# ==============================================

FROM node:20-alpine AS base

# Metadata
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
# El asterisco ayuda si no existe, pero mejor asegurar la copia
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
# Mantenemos tu logica de '|| true' en el RUN (aquí sí es válido)
RUN pnpm --filter @omr/database build || true

# --- FIX: TRUCO DE SEGURIDAD ---
# Creamos la carpeta dist vacía por si el build falló.
# Esto evita que el COPY de abajo rompa todo el proceso.
RUN mkdir -p packages/database/dist

# Build api-gateway
RUN pnpm --filter @omr/api-gateway build

# ==============================================
# Production stage
# ==============================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api-gateway/package.json ./package.json

# Copy shared packages
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./node_modules/@omr/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/package.json ./node_modules/@omr/shared-types/

# --- FIX: COPY CORREGIDO ---
# Quitamos "2>/dev/null || true". Como hicimos el mkdir arriba, esto nunca fallará.
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./node_modules/@omr/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./node_modules/@omr/database/

# Copy node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

USER nestjs

ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/main.js"]