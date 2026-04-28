# Boutique en poche

Jibi is a Morocco-first mobile SaaS for Instagram and WhatsApp micro-sellers who need a real mobile storefront, COD order operations, manual delivery coordination, and AI-assisted product copy in French, Arabic, and Darija.

## Paid V1 Focus

The current build is deliberately recentered on the first paid version: prove that a Moroccan social seller can replace her paper notebook with Jibi and pay 99 MAD/month for it.

- Wedge: Instagram/WhatsApp catalogue, public shop link, COD orders, manual courier handoff, customer history, cash tracking, and AI copy.
- Free gate: 20 orders/month.
- Pro promise: unlimited orders, AI product sheets, and WhatsApp relances.
- Roadmap, not v1 blockers: Business teams, advanced analytics, real delivery provider APIs, and full automated billing.

See `docs/paid-v1-recenter.md` for the product/tech audit and 15 minute prospect demo.

## Workspace

- `apps/mobile` — Expo Router mobile app.
- `apps/api` — NestJS API with Fastify, Prisma, tRPC, BullMQ, and external integrations.
- `apps/web` — Next.js public storefront.
- `packages/shared-types` — Zod schemas and inferred TypeScript types.
- `packages/trpc-router` — Shared tRPC type surface.
- `packages/ui-kit` — Design tokens for mobile, web, and API-generated metadata.

## Local Requirements

- Node `>=20.19 <26`
- pnpm `>=9.15 <10`
- PostgreSQL 17
- Redis 7+

## First Run

```bash
pnpm install
cp .env.example .env
pnpm prisma:validate
pnpm typecheck
```

Real credentials are required for Instagram Graph API, WhatsApp Business Cloud API, Claude, Paddle, Sentry, PostHog, Amana, Speedaf, and Sendit. The repository never stores secrets.

## Production Constraints

- TypeScript strict mode and `noUncheckedIndexedAccess` are enabled.
- Runtime validation uses Zod for external payloads.
- Mobile state uses Zustand, TanStack Query, and MMKV-backed persistence.
- Order state transitions are backend-owned.
- Manual delivery is the primary v1 flow; provider APIs remain isolated behind strategy adapters.
- User-facing copy lives in i18n dictionaries.
