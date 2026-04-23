# =====================================================================
# UrdeKo — image production Next.js (monorepo pnpm + Turbo).
# Cible : Northflank, Fly.io, k8s, etc.
#
# Build : docker build -t urdeko-web .
# Run    : docker run --env-file .env.prod -p 3000:3000 urdeko-web
# =====================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# --- Dépendances (cache layer) ----------------------------------------
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/scraper/package.json apps/scraper/
COPY apps/studio/package.json apps/studio/
COPY packages/design-system/package.json packages/design-system/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig/package.json packages/tsconfig/
RUN pnpm install --frozen-lockfile

# --- Build Next (standalone) ------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .

# Build sans valider toutes les clés (injectées au runtime sur Northflank).
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production

RUN pnpm exec turbo run build --filter=@urdeko/web

# --- Runtime -----------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# Artefact standalone Next 15 (app dans apps/web)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
