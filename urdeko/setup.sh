#!/usr/bin/env bash
# =====================================================================
# UrdeKo — setup interactif pour le dev local.
#
# Ce script :
#   1. Vérifie les prérequis (Docker, Node 20+, pnpm, openssl).
#   2. Demande (ou complète) les clés API tierces manquantes :
#        - GEMINI_API_KEY
#        - RESEND_API_KEY
#   3. Génère automatiquement AUTH_SECRET + INTERNAL_JOB_SECRET + CRON_SECRET.
#   4. Écrit/complète .env.local et apps/web/.env.local.
#   5. Démarre la stack Docker sur des ports décalés (pas de conflit) :
#        Postgres 55432 · MinIO 59000/59001 · Redis 56379
#      Next.js dev tourne sur :3300.
#   6. Installe les dépendances pnpm.
#   7. Pousse le schéma Drizzle vers Postgres.
#   8. Typecheck + build de l'app web.
#   9. Lance `pnpm --filter @urdeko/web dev` en avant-plan.
#
# Usage :
#   ./setup.sh              # tout, interactif
#   ./setup.sh --no-build   # saute l'étape build
#   ./setup.sh --no-start   # n'exécute pas pnpm dev à la fin
#   ./setup.sh --reset      # docker compose down -v avant de relancer
# =====================================================================

set -euo pipefail

# --- Style --- (ANSI-C quoting pour que les codes couleur soient réellement
# interprétés, sinon on voit littéralement "\033[1m" dans le terminal).
BOLD=$'\033[1m'
DIM=$'\033[2m'
RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BLUE=$'\033[34m'
RESET=$'\033[0m'

log()  { printf "%s▸%s %s\n" "$BLUE" "$RESET" "$*"; }
ok()   { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn() { printf "%s!%s %s\n" "$YELLOW" "$RESET" "$*"; }
err()  { printf "%s✗%s %s\n" "$RED" "$RESET" "$*" >&2; }
step() { printf "\n%s%s━━▶ %s%s\n" "$BOLD" "$BLUE" "$*" "$RESET"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# --- Args ---
DO_BUILD=1
DO_START=1
DO_RESET=0
for arg in "$@"; do
  case "$arg" in
    --no-build) DO_BUILD=0 ;;
    --no-start) DO_START=0 ;;
    --reset)    DO_RESET=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *) err "Option inconnue : $arg" ; exit 1 ;;
  esac
done

# =====================================================================
# 1. Prérequis
# =====================================================================
step "1. Vérification des prérequis"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "$1 est requis. $2"
    exit 1
  fi
  ok "$1 présent : $(command -v "$1")"
}

require_cmd docker "Installe Docker Desktop : https://www.docker.com/products/docker-desktop/"
if ! docker info >/dev/null 2>&1; then
  err "Le daemon Docker n'est pas démarré. Lance Docker Desktop puis relance ce script."
  exit 1
fi
ok "Docker daemon opérationnel"

require_cmd node "Installe Node 20+ : brew install node ou https://nodejs.org"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node 20+ requis (tu as $(node -v))."
  exit 1
fi
ok "Node $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm absent, activation via corepack…"
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@9.12.3 --activate >/dev/null 2>&1 || true
fi
require_cmd pnpm "Installe pnpm : npm i -g pnpm"
ok "pnpm $(pnpm -v)"

require_cmd openssl "Installe openssl (disponible par défaut sur macOS/Linux)"

# =====================================================================
# 2. Ports non défauts
# =====================================================================
step "2. Configuration des ports"

POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-55432}"
MINIO_HOST_PORT="${MINIO_HOST_PORT:-59000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-59001}"
REDIS_HOST_PORT="${REDIS_HOST_PORT:-56379}"
WEB_HOST_PORT="${WEB_HOST_PORT:-3300}"

export POSTGRES_HOST_PORT MINIO_HOST_PORT MINIO_CONSOLE_PORT \
       REDIS_HOST_PORT WEB_HOST_PORT

check_port_free() {
  local p="$1" label="$2"
  if lsof -iTCP:"$p" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    warn "Port $p ($label) déjà utilisé. Libère-le ou surcharge la variable avant de relancer."
  else
    ok "Port $p libre ($label)"
  fi
}

# Tue uniquement les processus en LISTEN sur le port (ex. ancien next dev dont
# la ligne de commande ne matche pas pkill -f "next (dev|build)").
free_port_listeners() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -z "$pids" ]; then
    return 0
  fi
  warn "Port $port occupé par PID(s) : $(echo "$pids" | tr '\n' ' '). Arrêt pour relancer Next.js…"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    err "Impossible de libérer le port $port. Libère-le manuellement ou utilise WEB_HOST_PORT=3301 ./setup.sh --no-build"
    exit 1
  fi
  ok "Port $port disponible."
}

check_port_free "$POSTGRES_HOST_PORT" "Postgres"
check_port_free "$MINIO_HOST_PORT"    "MinIO S3"
check_port_free "$MINIO_CONSOLE_PORT" "MinIO Console"
check_port_free "$REDIS_HOST_PORT"    "Redis"
check_port_free "$WEB_HOST_PORT"      "Next.js dev"

# =====================================================================
# 3. Clés API (interactif)
# =====================================================================
step "3. Collecte des clés API tierces"

ENV_FILE="$ROOT_DIR/.env.local"
WEB_ENV_FILE="$ROOT_DIR/apps/web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT_DIR/.env.local.example" "$ENV_FILE"
  ok "Créé .env.local à partir de l'exemple"
else
  ok ".env.local déjà présent, je complète uniquement les champs vides"
fi

get_env() {
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true
}

set_env() {
  local key="$1" value="$2"
  # Escape / and & and \ for sed.
  local esc
  esc=$(printf '%s' "$value" | sed -e 's/[\\/&]/\\&/g')
  if grep -qE "^${key}=" "$ENV_FILE"; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' -E "s|^${key}=.*|${key}=\"${esc}\"|" "$ENV_FILE"
    else
      sed -i -E "s|^${key}=.*|${key}=\"${esc}\"|" "$ENV_FILE"
    fi
  else
    printf '\n%s="%s"\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

prompt_if_empty() {
  local key="$1" label="$2" current
  current=$(get_env "$key" || true)
  if [ -z "${current:-}" ] || [ "$current" = "change-me-openssl-rand-base64-48-please" ]; then
    printf "  %s%s%s %s(entrée pour passer, tu pourras le configurer plus tard dans .env.local)%s\n  › " \
      "$BOLD" "$label" "$RESET" "$DIM" "$RESET"
    # shellcheck disable=SC2162
    read -r value < /dev/tty || value=""
    if [ -n "$value" ]; then
      set_env "$key" "$value"
      ok "$key enregistré"
    else
      warn "$key laissé vide — à renseigner avant le premier run IA"
    fi
  else
    ok "$key déjà configuré"
  fi
}

# Secrets auto-générés
current_auth_secret=$(get_env AUTH_SECRET)
if [ -z "${current_auth_secret:-}" ] || [ "$current_auth_secret" = "change-me-openssl-rand-base64-48-please" ]; then
  set_env AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  ok "AUTH_SECRET généré"
fi
current_internal=$(get_env INTERNAL_JOB_SECRET)
if [ -z "${current_internal:-}" ] || [ "$current_internal" = "dev_internal_job_secret_change_me_min_32_chars_long" ]; then
  set_env INTERNAL_JOB_SECRET "$(openssl rand -hex 32)"
  ok "INTERNAL_JOB_SECRET généré"
fi
current_cron=$(get_env CRON_SECRET)
if [ -z "${current_cron:-}" ] || [ "$current_cron" = "dev_cron_secret_change_me" ]; then
  set_env CRON_SECRET "$(openssl rand -hex 16)"
  ok "CRON_SECRET généré"
fi

# Ports appliqués dans le .env.local (source de vérité pour Next.js + Docker)
set_env POSTGRES_HOST_PORT "$POSTGRES_HOST_PORT"
set_env MINIO_HOST_PORT "$MINIO_HOST_PORT"
set_env MINIO_CONSOLE_PORT "$MINIO_CONSOLE_PORT"
set_env REDIS_HOST_PORT "$REDIS_HOST_PORT"
set_env WEB_HOST_PORT "$WEB_HOST_PORT"

# Endpoints cohérents avec les ports
set_env DATABASE_URL "postgresql://urdeko:urdeko@localhost:${POSTGRES_HOST_PORT}/urdeko"
set_env AUTH_URL "http://localhost:${WEB_HOST_PORT}"
set_env S3_ENDPOINT "http://localhost:${MINIO_HOST_PORT}"
set_env S3_PUBLIC_URL "http://localhost:${MINIO_HOST_PORT}/urdeko"
set_env REDIS_URL "redis://localhost:${REDIS_HOST_PORT}"

echo ""
log "Renseigne les clés API (laisse vide si tu les configureras plus tard) :"
prompt_if_empty GEMINI_API_KEY                "GEMINI_API_KEY (https://aistudio.google.com) :"
prompt_if_empty RESEND_API_KEY                "RESEND_API_KEY (https://resend.com) :"

# Miroir .env.local → apps/web/.env.local (Next.js lit dans chaque app)
cp "$ENV_FILE" "$WEB_ENV_FILE"
ok "apps/web/.env.local synchronisé avec .env.local"

# Écrit un .env utilisé par docker compose pour piocher les ports.
cat > "$ROOT_DIR/.env" <<EOF
POSTGRES_HOST_PORT=$POSTGRES_HOST_PORT
MINIO_HOST_PORT=$MINIO_HOST_PORT
MINIO_CONSOLE_PORT=$MINIO_CONSOLE_PORT
REDIS_HOST_PORT=$REDIS_HOST_PORT
WEB_HOST_PORT=$WEB_HOST_PORT
EOF
ok ".env racine (ports Docker) écrit"

# =====================================================================
# 4. Docker stack
# =====================================================================
step "4. Démarrage de la stack Docker"

if [ "$DO_RESET" = "1" ]; then
  warn "--reset demandé : docker compose down -v"
  docker compose down -v || true
fi

log "docker compose up -d"
docker compose up -d

log "Attente des healthchecks (max 60s)…"
for i in {1..60}; do
  pg_ok=$(docker inspect --format='{{.State.Health.Status}}' urdeko-postgres 2>/dev/null || echo "starting")
  minio_ok=$(docker inspect --format='{{.State.Health.Status}}' urdeko-minio 2>/dev/null || echo "starting")
  redis_ok=$(docker inspect --format='{{.State.Health.Status}}' urdeko-redis 2>/dev/null || echo "starting")
  if [ "$pg_ok" = "healthy" ] && [ "$minio_ok" = "healthy" ] && [ "$redis_ok" = "healthy" ]; then
    ok "Postgres, MinIO, Redis healthy."
    break
  fi
  sleep 1
  if [ "$i" = "60" ]; then
    warn "Timeout de healthcheck. Vérifie avec : docker compose ps"
  fi
done

# Init MinIO bucket tourne en one-shot ; on laisse se finir en arrière-plan.
docker compose up -d minio-init >/dev/null 2>&1 || true

printf "\n  Services disponibles :\n"
printf "    %sPostgres%s postgresql://urdeko:urdeko@localhost:%s/urdeko\n" "$DIM" "$RESET" "$POSTGRES_HOST_PORT"
printf "    %sMinIO   %s http://localhost:%s (console :%s — urdeko / urdeko-dev-secret)\n" "$DIM" "$RESET" "$MINIO_HOST_PORT" "$MINIO_CONSOLE_PORT"
printf "    %sRedis   %s redis://localhost:%s\n\n" "$DIM" "$RESET" "$REDIS_HOST_PORT"

# =====================================================================
# 5. Dépendances pnpm
# =====================================================================
step "5. Installation des dépendances pnpm"

if [ ! -d "node_modules" ] || [ ! -d "apps/web/node_modules" ]; then
  pnpm install
else
  log "node_modules présents, pnpm install rapide (sync éventuel)"
  pnpm install
fi
ok "Dépendances à jour"

# =====================================================================
# 6. Migration DB
# =====================================================================
step "6. Migration du schéma Drizzle → Postgres"

pnpm --filter @urdeko/web db:push
ok "Schéma Postgres synchronisé"

# =====================================================================
# 7. Typecheck + build
# =====================================================================
if [ "$DO_BUILD" = "1" ]; then
  step "7. Typecheck + build"
  if pnpm -r typecheck; then
    ok "Typecheck OK"
  else
    err "Typecheck a échoué — corrige puis relance ./setup.sh --no-start"
    exit 1
  fi

  # Nettoyage systématique : un .next partiel d'un run précédent échoué
  # provoque des PageNotFoundError sur /_not-found avec Next 15.
  log "Nettoyage du cache .next (évite les manifestes stales)"
  # Un next dev/build toujours en cours garde .next verrouillé → on le tue.
  if pgrep -f "next (dev|build)" >/dev/null 2>&1; then
    warn "Un processus next dev/build tourne encore, je l'arrête."
    pkill -f "next (dev|build)" 2>/dev/null || true
    sleep 2
  fi
  # Rend tous les fichiers writables avant rm (certains fichiers workbox
  # peuvent être en lecture seule).
  if [ -d "$ROOT_DIR/apps/web/.next" ]; then
    chmod -R u+w "$ROOT_DIR/apps/web/.next" 2>/dev/null || true
    if ! rm -rf "$ROOT_DIR/apps/web/.next" 2>/dev/null; then
      warn "rm -rf .next a échoué (permissions ?). On tente avec find -delete."
      find "$ROOT_DIR/apps/web/.next" -depth -exec rm -rf {} + 2>/dev/null || true
    fi
  fi
  if [ -d "$ROOT_DIR/apps/web/.next" ]; then
    err "Impossible de supprimer apps/web/.next. Lance : sudo rm -rf apps/web/.next"
    exit 1
  fi

  # En mode setup initial, certaines clés API peuvent être vides : on
  # passe SKIP_ENV_VALIDATION=1 pour que le build passe. Au runtime, les
  # appels réseau échoueront tant que les clés ne sont pas renseignées.
  missing_keys=()
  for key in GEMINI_API_KEY RESEND_API_KEY; do
    val=$(get_env "$key")
    if [ -z "${val:-}" ]; then
      missing_keys+=("$key")
    fi
  done

  build_env=()
  if [ "${#missing_keys[@]}" -gt 0 ]; then
    warn "Clés API non renseignées : ${missing_keys[*]}"
    warn "Build avec SKIP_ENV_VALIDATION=1 — recomplète dans .env.local pour le runtime."
    build_env+=("SKIP_ENV_VALIDATION=1")
  fi

  # Bash 3.2 (macOS) + `set -u` traite "${arr[@]}" comme unbound si arr est vide,
  # d'où le ${arr[@]+"${arr[@]}"} qui n'expand que si le tableau est non vide.
  if env ${build_env[@]+"${build_env[@]}"} pnpm --filter @urdeko/web build; then
    ok "Build Next.js OK (.next/)"
  else
    err "Build échoué. Vérifie les logs ci-dessus."
    exit 1
  fi
else
  warn "--no-build : étape build sautée"
fi

# =====================================================================
# 8. Lancement
# =====================================================================
if [ "$DO_START" = "0" ]; then
  echo ""
  ok "Setup terminé. Pour démarrer plus tard :"
  printf "    %sPORT=%s pnpm --filter @urdeko/web dev%s\n\n" "$BOLD" "$WEB_HOST_PORT" "$RESET"
  exit 0
fi

step "8. Lancement de Next.js en mode dev (Ctrl+C pour stopper)"
echo ""
ok "UrdeKo sera servi sur http://localhost:${WEB_HOST_PORT}"

# Si des clés tiers manquent, on active SKIP_ENV_VALIDATION en dev pour que
# les pages autres que celles exploitant ces clés soient tout de même servies.
runtime_missing=()
for key in GEMINI_API_KEY RESEND_API_KEY; do
  val=$(get_env "$key")
  if [ -z "${val:-}" ]; then
    runtime_missing+=("$key")
  fi
done
if [ "${#runtime_missing[@]}" -gt 0 ]; then
  warn "Clés manquantes (${runtime_missing[*]}). Dev server lancé avec SKIP_ENV_VALIDATION=1."
  warn "Les pages touchant à ces clés échoueront au runtime jusqu'à ce que tu les renseignes."
  export SKIP_ENV_VALIDATION=1
fi
echo ""

free_port_listeners "$WEB_HOST_PORT"

export PORT="$WEB_HOST_PORT"
exec pnpm --filter @urdeko/web dev
