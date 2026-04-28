# Android Closed Testing Checklist

Jibi GTM v1 ships Android first through Play closed testing before public production.

## Build

- Set every `EXPO_PUBLIC_*` value in the EAS project.
- Set API secrets for Clerk, R2, Instagram, WhatsApp, Paddle, Sentry, PostHog, Postgres, Redis, and encryption.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @bep/mobile build`, and `pnpm --filter @bep/web build`.
- Build preview with `eas build --platform android --profile preview`.

## Smoke Test

- Fresh install opens onboarding, Clerk sign-in, and shop onboarding without blank screens.
- Existing seller lands directly on Accueil.
- Product photo upload returns an R2 public URL, not a local device URI.
- Seller creates, publishes, edits, and archives a product.
- Instagram connect/import creates draft products when Meta credentials are valid.
- Seller creates WhatsApp/Instagram manual COD order and processes it to delivered.
- Manual courier assignment works without Amana, Speedaf, or Sendit credentials.
- COD cash moves from pending to collected to remitted.
- Pro checkout opens Paddle and plan refreshes after webhook.
- Sentry receives a test exception and PostHog receives core events.

## Store Readiness

- App name: Jibi.
- Package: `ma.jibi.mobile`.
- Closed testing track only for this phase.
- Support contact, privacy policy, and deletion instructions must be ready before public production.
