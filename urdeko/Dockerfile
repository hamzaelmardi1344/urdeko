# =====================================================================
# UrdeKo — image production Next.js (monorepo pnpm + Turbo).
# Cible : Fly.io, Railway, k8s, exécution locale, etc.
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

# Build sans valider toutes les clés (complétées au runtime sur la plateforme).
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production

# Next.js inline les NEXT_PUBLIC_* au moment du `next build` : les passer en
# --build-arg (CI / registry) ou en ENV avant cette ligne.
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET=production
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN pnpm exec turbo run build --filter=@urdeko/web

# --- Runtime -----------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# L'image `node:*-bookworm-slim` fournit déjà un utilisateur non-root `node`
# (uid 1000). On s'en sert plutôt que de recréer un utilisateur, ce qui évite
# les soucis `SYS_UID_MAX` / `adduser` sous certains environnements BuildKit.

# Artefact standalone Next 15 (app dans apps/web)
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

# Bundle Drizzle (hors du standalone) : `drizzle-kit push` au démarrage via
# docker/entrypoint.sh (schéma aligné sur la DB avant le serveur Next).
COPY --from=builder --chown=node:node /app/node_modules /app/db-migrate/node_modules
COPY --from=builder --chown=node:node /app/apps/web/node_modules /app/db-migrate/apps/web/node_modules
COPY --from=builder --chown=node:node /app/apps/web/drizzle.config.ts /app/db-migrate/apps/web/drizzle.config.ts
COPY --from=builder --chown=node:node /app/apps/web/package.json /app/db-migrate/apps/web/package.json
COPY --from=builder --chown=node:node /app/apps/web/src/lib/db /app/db-migrate/apps/web/src/lib/db

COPY docker/entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && chown node:node /app/docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
