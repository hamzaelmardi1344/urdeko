# Deploy

## Environments

Use separate `local`, `preview`, and `production` environments. Each environment needs its own Clerk, PostHog, Sentry, Paddle, Meta, Claude, Redis, and PostgreSQL credentials.

## API

1. Provision PostgreSQL 17 and Redis.
2. Set every variable from `.env.example`.
3. Run `pnpm --filter @bep/api prisma:migrate:deploy`.
4. Run `pnpm --filter @bep/api build`.
5. Start `node apps/api/dist/main.js` behind HTTPS with HSTS.

## Web

1. Set `NEXT_PUBLIC_API_URL` and the server-side API variables used by storefront reads.
2. Run `pnpm --filter @bep/web build`.
3. Deploy behind HTTPS with the configured CSP headers.

## Mobile

1. Configure EAS secrets from `.env.example`.
2. Start with Expo Go for development when possible.
3. Use EAS builds for production because Sentry, FCM, and native storage require production signing.

## CI/CD

GitHub Actions runs install, Prisma validation/generation, typecheck, tests, Expo config validation, and Next build on every push and pull request.
