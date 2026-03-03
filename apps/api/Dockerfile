# ─────────────────────────────────────────────────────────────────────────────
# apps/api — Production image (multi-stage)
# Stage 1: builder  → compile TypeScript
# Stage 2: runner   → minimal Node.js runtime, no dev deps
# Context: monorepo root
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/

# Install all deps (including devDeps needed for tsc)
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages

# Compile TypeScript
RUN pnpm --filter @apex-os/api build

# Prune to production deps only
RUN pnpm --filter @apex-os/api --prod deploy /app/prod/api

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 apexgroup \
    && adduser  --system --uid 1001 apexuser

WORKDIR /app

# Copy compiled output + pruned node_modules from builder
COPY --from=builder --chown=apexuser:apexgroup /app/prod/api/node_modules ./node_modules
COPY --from=builder --chown=apexuser:apexgroup /app/apps/api/dist ./dist
# Copy migration files so db:migrate can run at startup if needed
COPY --from=builder --chown=apexuser:apexgroup /app/apps/api/drizzle ./drizzle
COPY --from=builder --chown=apexuser:apexgroup /app/apps/api/drizzle.config.ts ./drizzle.config.ts

USER apexuser

EXPOSE 4000

CMD ["node", "dist/index.js"]
