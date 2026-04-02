# ============================================================
# Stage 1 — Install dependencies (cached when package.json unchanged)
# ============================================================
FROM node:22-alpine AS deps

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — Build shared package
# ============================================================
FROM deps AS build-shared

COPY packages/shared ./packages/shared
RUN pnpm --filter @construction/shared build

# ============================================================
# Stage 3 — Build API (production)
# ============================================================
FROM deps AS build-api

COPY packages/shared ./packages/shared
RUN pnpm --filter @construction/shared build

COPY packages/api ./packages/api

ENV NODE_ENV=production
RUN pnpm --filter @construction/api build

# ============================================================
# Stage 4 — Production runtime
# ============================================================
FROM node:22-alpine AS production

RUN corepack enable pnpm && \
    apk add --no-cache wget

WORKDIR /app

ENV NODE_ENV=production

# Copy installed deps + built artifacts from build stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build-api /app/packages/api/dist ./dist
COPY --from=build-api /app/packages/api/node_modules ./node_modules_api

# Shared package runtime
COPY --from=build-shared /app/packages/shared/dist ./shared_dist
COPY --from=deps /app/node_modules/@construction ./node_modules/@construction

# Clean up duplicated node_modules
RUN rm -rf node_modules_api && \
    mv node_modules node_modules_api; \
    cp -r node_modules_api/. node_modules

# Setup upload directory
RUN mkdir -p /app/uploads

COPY --chmod=755 <<'HEALTH_SCRIPT'
#!/bin/sh
exec wget --quiet --tries=1 --spider http://localhost:3001/api/v1/health
HEALTH_SCRIPT

EXPOSE 3001

CMD ["sh", "-c", "node dist/server.js"]

# ============================================================
# Dev overlay — runs on top of production image for hot-reload
# (activated via docker-compose override or separate compose)
# ============================================================
FROM production AS development

RUN corepack enable pnpm && \
    pnpm install

WORKDIR /app/packages/api

# Dev-only deps
RUN pnpm add --save-dev tsx

COPY packages/api/src ./src
COPY packages/shared/src ./shared

EXPOSE 3001

CMD ["pnpm", "dev"]
