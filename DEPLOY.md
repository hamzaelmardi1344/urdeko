# Deploy

## Environments

Use separate `local`, `preview`, and `production` environments. Each environment needs its own Clerk, PostHog, Sentry, Paddle, Meta, Claude, Redis, and PostgreSQL credentials.

## API

1. Provision PostgreSQL 17 and Redis.
2. Set every variable from `.env.example`.
3. Expose the preview API through HTTPS before testing Meta or Paddle webhooks. A deploy preview URL is preferred; a Cloudflare Tunnel or ngrok URL is acceptable for local validation.
4. Configure webhook URLs:
   - WhatsApp: `${PUBLIC_API_URL}/notifications/whatsapp/webhook`
   - Paddle: `${PUBLIC_API_URL}/billing/webhook`
5. Run `pnpm --filter @bep/api prisma:migrate:deploy`.
6. Run `pnpm --filter @bep/api build`.
7. Start `node apps/api/dist/main.js` behind HTTPS with HSTS.

## Preview Integration Diagnostics

- `GET /integrations/status` returns only provider health metadata and missing variable names. It never returns secret values.
- `POST /integrations/r2/verify` writes a tiny diagnostic image to R2, checks object access, checks the public URL when possible, and deletes the object.
- `POST /notifications/whatsapp/test-template` sends a real WhatsApp Cloud template to a test E.164 number.
- Paddle webhooks must be sent with the raw request body intact; signature verification uses `@paddle/paddle-node-sdk`.
- Instagram OAuth state is signed per shop and expires after 10 minutes.

## Web

1. Set `NEXT_PUBLIC_API_URL` and the server-side API variables used by storefront reads.
2. Run `pnpm --filter @bep/web build`.
3. Deploy behind HTTPS with the configured CSP headers.

## Mobile

1. Configure EAS secrets from `.env.example`.
2. Start with Expo Go for development when possible.
3. Run `pnpm preview:check` before creating any internal APK.
4. Use `pnpm preview:android` for the Android preview build, or run `eas build --platform android --profile preview` directly after the same checks.
5. Open Boutique -> Intégrations in the installed build to verify `/health/preview`, credentials, notifications, Sentry, and PostHog.
6. Use EAS production builds for public release because Sentry, FCM, and native storage require production signing.
7. Follow `docs/android-preview-runbook.md` and `docs/android-closed-testing.md` before promoting any build.

## CI/CD

GitHub Actions runs install, preview env validation, Prisma validation/generation, lint, typecheck, tests, Expo config validation, mobile export, and Next build on every push and pull request.
