import {
  rateResultSchema,
  shipmentResultSchema,
  trackingStatusSchema,
  type CreateShipmentInput,
  type RateInput,
  type RateResult,
  type ShipmentResult,
  type TrackingStatus,
  type WebhookEvent,
} from "@bep/shared-types";
import type { DeliveryProviderAdapter } from "./delivery-provider-adapter";

export class ManualDeliveryAdapter implements DeliveryProviderAdapter {
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    return shipmentResultSchema.parse({
      externalId: `manual-${input.reference}`,
      trackingUrl: undefined,
      rawStatus: "manual_created",
      rawPayload: { reference: input.reference, provider: "MANUAL" },
    });
  }

  async trackShipment(externalId: string): Promise<TrackingStatus> {
    return trackingStatusSchema.parse({
      externalId,
      rawStatus: "manual_tracking",
      mappedStatus: "unknown",
      rawPayload: { externalId, provider: "MANUAL" },
    });
  }

  async cancelShipment(): Promise<void> {
    return Promise.resolve();
  }

  async parseWebhook(): Promise<WebhookEvent> {
    throw new Error("Manual delivery does not accept provider webhooks");
  }

  async estimateRate(input: RateInput): Promise<RateResult> {
    return rateResultSchema.parse({
      provider: "MANUAL",
      priceMAD: 0,
      etaDaysMin: 0,
      etaDaysMax: 0,
      rawPayload: { fromCity: input.fromCity, toCity: input.toCity },
    });
  }
}
