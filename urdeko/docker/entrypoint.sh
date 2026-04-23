#!/bin/sh
# Applique le schéma Drizzle au démarrage (DATABASE_URL → Postgres).
# Désactiver : SKIP_DB_PUSH=1
set -eu

if [ "${SKIP_DB_PUSH:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_DB_PUSH=1 — pas de drizzle-kit push."
elif [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL vide — drizzle-kit push ignoré (smoke test / image locale)." >&2
else
  echo "[entrypoint] drizzle-kit push…"
  cd /app/db-migrate/apps/web
  node ./node_modules/drizzle-kit/bin.cjs push
  cd /app
fi

exec node apps/web/server.js
