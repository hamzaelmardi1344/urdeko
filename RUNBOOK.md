# Runbook

## Incident Triage

1. Check Sentry for mobile and API exceptions with the affected `userId` and `shopId`.
2. Check Pino logs for the same correlation ID.
3. Inspect PostHog funnels for scope and regression timing.
4. Pause affected feature flags in PostHog when a rollout causes user-facing errors.

## Delivery Provider Failures

- For paid v1, keep `MANUAL` delivery operational first. It requires only courier name, optional phone, handoff notes, and order status updates.
- If provider API credentials fail, disable that provider for the shop and leave manual delivery enabled.
- If a webhook payload cannot be parsed, store the raw payload in logs with PII redaction and alert the integration owner.
- If cash collection status disagrees with the order, keep the order status unchanged and surface the delivery status as an operational warning.

## COD Cash Reconciliation

- `PENDING` means cash is still expected from the customer or courier.
- `COLLECTED` means the order was delivered and COD cash was collected.
- `REMITTED` means the seller has received or reconciled the collected cash.
- Delivery status and cash status are intentionally separate; do not mark cash remitted just because an order is delivered.

## Data Privacy

- Account deletion anonymizes PII and preserves aggregated accounting records.
- Phone numbers and addresses are redacted from logs.
- Delivery API keys are stored encrypted with AES-256-GCM.

## Failed External Credentials

- Instagram, WhatsApp, Claude, Paddle, Amana, Speedaf, and Sendit failures should be treated as credential or provider incidents first.
- Check the provider dashboard and rotate only the affected credential.
- Keep feature flags off for the affected integration until a real credential-backed smoke test passes.
