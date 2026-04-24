.PHONY: setup up down logs reset dev seed scrape db-push db-studio typecheck test

# Ports décalés pour ne pas entrer en conflit avec des services déjà en écoute.
POSTGRES_HOST_PORT ?= 55432
MINIO_HOST_PORT    ?= 59000
MINIO_CONSOLE_PORT ?= 59001
REDIS_HOST_PORT    ?= 56379
WEB_HOST_PORT      ?= 3300

export POSTGRES_HOST_PORT MINIO_HOST_PORT MINIO_CONSOLE_PORT \
       REDIS_HOST_PORT WEB_HOST_PORT

setup:
	./setup.sh

up:
	docker compose up -d
	@echo ""
	@echo "Services lancés :"
	@echo "  - Postgres : localhost:$(POSTGRES_HOST_PORT) (user/pass: urdeko/urdeko)"
	@echo "  - MinIO    : http://localhost:$(MINIO_CONSOLE_PORT) (console) — root: urdeko / urdeko-dev-secret"
	@echo "  - Redis    : localhost:$(REDIS_HOST_PORT)"
	@echo "  - Web dev  : http://localhost:$(WEB_HOST_PORT) (make dev)"

down:
	docker compose down

logs:
	docker compose logs -f

reset:
	docker compose down -v
	docker compose up -d

dev:
	PORT=$(WEB_HOST_PORT) pnpm --filter @urdeko/web dev

seed:
	pnpm --filter @urdeko/web db:seed

scrape:
	@echo "Le scrape est désormais déclenché par Vercel Cron (cf. apps/web/vercel.json)."
	@echo "Pour le lancer en local : curl -H \"Authorization: Bearer \$$CRON_SECRET\" http://localhost:$(WEB_HOST_PORT)/api/cron/scrape"

db-push:
	pnpm --filter @urdeko/web db:push

db-studio:
	pnpm --filter @urdeko/web db:studio

typecheck:
	pnpm -r typecheck

test:
	pnpm --filter @urdeko/web test
