# Loi 09-08 Data Handling

## Personal Data

Jibi stores seller identity, customer names, phone numbers, delivery addresses, order history, and delivery provider references.

## Purpose

Data is processed for storefront publication, COD order fulfillment, WhatsApp notifications, delivery coordination, billing, analytics, and support.

## Retention

Operational order and billing records are retained for accounting and dispute handling. Account deletion anonymizes personal fields while preserving aggregated financial records.

## User Rights

The API exposes `DELETE /auth/me`, which anonymizes the seller account and customer PII owned by the shop.

## Security Controls

Provider API keys are encrypted with AES-256-GCM, logs redact PII fields, API access is tenant-scoped, webhook signatures are verified where provider signatures are available, and production deployments must use HTTPS with HSTS.
