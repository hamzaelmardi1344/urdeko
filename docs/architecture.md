# Architecture

Jibi is split into three apps and three shared packages:

- Mobile owns seller workflows and uses Clerk sessions, TanStack Query, MMKV cache fallback, Zustand state, i18n-js, PostHog flags, and Sentry.
- API owns tenancy, state transitions, provider credentials, provider webhooks, AI generation, billing, and public storefront checkout.
- Web owns the public storefront rendered by slug and submits COD orders to the API.

## Tenancy

Every authenticated API request passes through Clerk auth and `ShopGuard`. Public storefront, WhatsApp, Paddle, and delivery webhooks are explicitly marked public.

## Order State

Mobile calls actions such as `confirm`, `mark-prepared`, and `mark-delivered`. The API validates transitions with the shared state machine before writing status and timeline events.

## Offline

Mobile GET reads are cached in MMKV. If a network read fails, the last valid cached payload is returned for dashboard, shop, orders, products, customers, and templates.

## Provider Strategy

Delivery providers implement `DeliveryProviderAdapter`. Amana, Speedaf, and Sendit use real HTTP endpoints and shop-level encrypted API keys. Manual delivery is a first-class local provider.
