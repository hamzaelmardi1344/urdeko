# Runbook

## Incident Triage

1. Check Sentry for mobile and API exceptions with the affected `userId` and `shopId`.
2. Check Pino logs for the same correlation ID.
3. Inspect PostHog funnels for scope and regression timing.
4. Pause affected feature flags in PostHog when a rollout causes user-facing errors.

## Delivery Provider Failures

- If provider API credentials fail, disable that provider for the shop and leave manual delivery enabled.
- If a webhook payload cannot be parsed, store the raw payload in logs with PII redaction and alert the integration owner.
- If cash collection status disagrees with the order, keep the order status unchanged and surface the delivery status as an operational warning.

## Data Privacy

- Account deletion anonymizes PII and preserves aggregated accounting records.
- Phone numbers and addresses are redacted from logs.
- Delivery API keys are stored encrypted with AES-256-GCM.
