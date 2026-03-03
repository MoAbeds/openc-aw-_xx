# ─────────────────────────────────────────────────────────────────────────────
# apps/web — Production image (multi-stage, Next.js standalone)
# Stage 1: deps      → install all dependencies
# Stage 2: builder   → next build (standalone output)
# Stage 3: runner    → minimal runtime with standalone output only
# Context: monorepo root
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY apps/web ./apps/web
COPY packages ./packages
COPY package.json pnpm-workspace.yaml ./

# Set build-time env (public vars only — secrets stay out of image)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /app/apps/web
RUN pnpm build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 apexgroup \
    && adduser  --system --uid 1001 apexuser

WORKDIR /app

# Next.js standalone output bundles everything needed; copy it + static assets
COPY --from=builder --chown=apexuser:apexgroup /app/apps/web/.next/standalone ./
COPY --from=builder --chown=apexuser:apexgroup /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=apexuser:apexgroup /app/apps/web/public ./apps/web/public

USER apexuser

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone entrypoint
CMD ["node", "apps/web/server.js"]
