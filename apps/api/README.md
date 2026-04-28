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

## Verification

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boutique_en_poche pnpm prisma:validate
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boutique_en_poche pnpm prisma:generate
pnpm typecheck
pnpm test
```
