import type {
  CreateShipmentInput,
  RateInput,
  RateResult,
  ShipmentResult,
  TrackingStatus,
  WebhookEvent,
} from "@bep/shared-types";

export interface DeliveryProviderAdapter {
  createShipment(input: CreateShipmentInput, apiKey: string): Promise<ShipmentResult>;
  trackShipment(externalId: string, apiKey: string): Promise<TrackingStatus>;
  cancelShipment(externalId: string, apiKey: string): Promise<void>;
  parseWebhook(payload: unknown): Promise<WebhookEvent>;
  estimateRate(input: RateInput, apiKey: string): Promise<RateResult>;
}
