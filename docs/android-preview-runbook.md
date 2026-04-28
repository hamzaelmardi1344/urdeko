# Android Preview Runbook

This runbook prepares a Jibi Android preview build that can be installed internally without a Play Store public release.

## 1. API Preview

1. Expose the API through HTTPS. Use a deploy preview, Cloudflare Tunnel, or ngrok.
2. Set `PUBLIC_API_URL` to that HTTPS URL.
3. Confirm `GET /health/preview` returns `ok`, `dbReachable`, `redisReachable`, and `checkedAt` without authentication.
4. Configure webhooks:
   - WhatsApp: `${PUBLIC_API_URL}/notifications/whatsapp/webhook`
   - Paddle: `${PUBLIC_API_URL}/billing/webhook`
5. Keep all secrets in the preview server environment only.

## 2. EAS Environment

Set these public mobile variables in EAS:

- `APP_ENV=preview`
- `ANDROID_VERSION_CODE`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_WEB_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_POSTHOG_API_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`

Set build/service variables without committing values:

- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `GOOGLE_SERVICES_FILE` when FCM is enabled

## 3. Server Credentials

Set API-side preview credentials for Clerk, Postgres, Redis, encryption, R2, Meta Instagram, WhatsApp Cloud, Paddle sandbox, Claude, Sentry, and PostHog. Missing integration credentials are acceptable for early smoke tests, but the mobile Intégrations screen must show exactly which variable names are missing.

## 4. Preflight

Run:

```sh
pnpm preview:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @bep/api prisma:validate
pnpm --filter @bep/api prisma:generate
pnpm --filter @bep/mobile build
pnpm --filter @bep/web build
pnpm --filter @bep/mobile exec expo install --check
```

For the actual Android preview command, make sure `EXPO_PUBLIC_API_URL` is HTTPS and not localhost, then run:

```sh
pnpm preview:android
```

The script runs the strict preview check before calling `eas build --platform android --profile preview`.

## 5. APK Smoke Test

1. Install the EAS preview artifact on an Android device.
2. Open the app cold and confirm onboarding renders.
3. Sign in with Clerk test credentials.
4. Open Boutique -> Intégrations.
5. Confirm Preview Android shows the expected app env, package, API URL, version, Clerk, Sentry, PostHog, and notification permission status.
6. Tap Rafraîchir statuts and verify `/health/preview` separates API network health from authenticated integration status.
7. Tap Demander notifications, Tester Sentry, and Tester PostHog.
8. Run R2 verify, WhatsApp template test, Instagram import, Claude product copy, and Paddle checkout when their credentials are configured.

## 6. Troubleshooting

- If `preview:android` fails before EAS, check `EXPO_PUBLIC_API_URL`; Android devices cannot reach localhost.
- If Preview Android shows API degraded, verify Postgres/Redis and `PUBLIC_API_URL`.
- If `/integrations/status` fails but `/health/preview` succeeds, the API is reachable and the likely issue is Clerk/auth/shop setup.
- If Sentry/PostHog test buttons show missing config, set the public mobile env values in EAS and rebuild.
