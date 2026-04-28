# Jibi Paid V1 Recenter

## Product Wedge

Jibi v1 is now centered on the first paid promise: an Instagram and WhatsApp seller replaces her paper notebook with one mobile workflow for catalogue, COD orders, customers, manual delivery, cash tracking, and Darija/French product copy.

The subscription target is Pro at 99 MAD/month. Free remains capped at 20 monthly orders. Pro unlocks unlimited orders, AI copy, and WhatsApp relance workflows.

## What Is Actually Usable

- Mobile shell, onboarding, catalogue, orders, customers, shop settings, billing entry, and storefront preview routes exist.
- Public storefront can display published products, accept a COD order, and post it to the API with `source = PUBLIC_LINK`.
- API enforces backend-owned order transitions and now tracks order source, COD cash status, reminders, and manual courier handoff fields.
- Manual delivery is the primary v1 fulfillment mode and does not require Amana, Speedaf, or Sendit credentials.
- Dashboard now exposes pending orders, revenue, COD pending cash, COD collected cash, Free quota usage, top customers, and top products.

## What Is Still Scaffolding

- tRPC package is a typed placeholder while mobile currently uses validated REST calls.
- Clerk, Sentry, PostHog, Paddle, Instagram, WhatsApp, and Claude integrations are wired as production adapters/config surfaces, but need real credentials for end-to-end smoke tests.
- Delivery provider API adapters stay available for roadmap validation, but they are not required for the paid v1 demo.
- Maestro flows are present as smoke shells and need authenticated test fixtures before they can prove the full seller journey.

## Deferred From V1

- Business multi-user roles.
- Advanced analytics and boost tooling.
- Real Amana, Speedaf, and Sendit shipment creation as a must-have.
- TikTok Shop.
- Full billing automation when the first 99 MAD/month payments can be validated manually.

## 15 Minute Paid Demo

1. Create or open Imene's shop and show the shareable public link.
2. Add a product or import an Instagram post into draft, then publish it.
3. Open the public storefront and place a COD order with a Moroccan phone number.
4. In mobile, confirm the order and mark it prepared.
5. Assign a manual courier with name, phone, notes, and handoff date.
6. Mark the order delivered so COD cash becomes collected.
7. Mark cash remitted and show the dashboard cash counters update.
8. Generate or show AI product copy in Darija/French when Claude credentials are present.

## Validation Tests

- Free shop blocks order creation after 20 orders in the current month.
- Pro and Business shops can create more than 20 monthly orders.
- Invalid status jumps are rejected by the API.
- Manual delivery can hand over a prepared order without external provider credentials.
- Delivered COD orders move cash from pending to collected.
- Remitted COD cash is tracked separately from delivery status.
- Five warm prospects watch the demo; at least two either pay 99 MAD/month or give a clear commitment.

## Refusal Reasons To Capture

- Price.
- Trust.
- Missing feature.
- UX friction.
- Delivery operations.
- Payment or cash reconciliation.
