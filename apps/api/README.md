# API

NestJS 11 API for Jibi with Fastify, Prisma, tRPC-ready domain contracts, BullMQ queues, Pino logging, Clerk auth, and production adapters for external providers.

## External Provider Testing

The following adapters call real provider endpoints and require real credentials:

- `@requires_real_credentials_to_test` Instagram Graph API import.
- `@requires_real_credentials_to_test` WhatsApp Business Cloud API templates and webhooks.
- `@requires_real_credentials_to_test` Claude product-copy generation.
- `@requires_real_credentials_to_test` Paddle Billing v2 checkout and webhooks.
- `@requires_real_credentials_to_test` Amana delivery adapter.
- `@requires_real_credentials_to_test` Speedaf delivery adapter.
- `@requires_real_credentials_to_test` Sendit delivery adapter.

Manual delivery is a first-class local provider and does not call an external API.

## Preview Diagnostics

- `GET /integrations/status` reports R2, Instagram, WhatsApp, Paddle, and Claude readiness for the authenticated shop. It returns `configured`, `connected`, `mode`, `missingEnv`, and `lastCheckedAt`, never secret values.
- `POST /integrations/r2/verify` writes and deletes a tiny R2 object, then checks the public URL when possible.
- `POST /notifications/whatsapp/test-template` sends a real template message to a supplied E.164 test number.
- Paddle and WhatsApp webhooks require the raw Fastify body. Paddle verification uses the official `@paddle/paddle-node-sdk`; WhatsApp uses `x-hub-signature-256` over the raw body.
- Instagram OAuth state is signed for the current shop and expires after 10 minutes before code exchange.
- Claude product copy uses a forced tool schema and Zod validation instead of free-form JSON parsing.

## Verification

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boutique_en_poche pnpm prisma:validate
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boutique_en_poche pnpm prisma:generate
pnpm typecheck
pnpm test
```
