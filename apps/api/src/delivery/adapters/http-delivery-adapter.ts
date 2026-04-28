import {
  deliveryWebhookEventSchema,
  rateResultSchema,
  shipmentResultSchema,
  trackingStatusSchema,
  type CreateShipmentInput,
  type DeliveryProvider,
  type RateInput,
  type RateResult,
  type ShipmentResult,
  type TrackingStatus,
  type WebhookEvent,
} from "@bep/shared-types";

type AdapterEndpoints = {
  createShipmentPath: string;
  shipmentPath: (externalId: string) => string;
  cancelPath: (externalId: string) => string;
  ratePath: (input: RateInput) => string;
};

export class HttpDeliveryAdapter {
  constructor(
    private readonly provider: DeliveryProvider,
    private readonly baseUrl: string,
    private readonly endpoints: AdapterEndpoints,
  ) {}

  async createShipment(input: CreateShipmentInput, apiKey: string): Promise<ShipmentResult> {
    const payload = await this.request(this.endpoints.createShipmentPath, apiKey, {
      method: "POST",
      body: input,
    });
    return shipmentResultSchema.parse({
      externalId: this.readString(payload, "id", "externalId", "tracking_id"),
      trackingUrl: this.readOptionalString(payload, "trackingUrl", "tracking_url"),
      rawStatus: this.readString(payload, "status"),
      rawPayload: this.toRecord(payload),
    });
  }

  async trackShipment(externalId: string, apiKey: string): Promise<TrackingStatus> {
    const payload = await this.request(this.endpoints.shipmentPath(externalId), apiKey, {
      method: "GET",
    });
    return trackingStatusSchema.parse({
      externalId,
      rawStatus: this.readString(payload, "status"),
      mappedStatus: this.mapStatus(this.readString(payload, "status")),
      deliveredAt: this.readOptionalString(payload, "deliveredAt", "delivered_at"),
      cashCollectedMAD: this.readOptionalNumber(payload, "cashCollectedMAD", "cash_collected_mad"),
      rawPayload: this.toRecord(payload),
    });
  }

  async cancelShipment(externalId: string, apiKey: string): Promise<void> {
    await this.request(this.endpoints.cancelPath(externalId), apiKey, { method: "POST" });
  }

  async parseWebhook(payload: unknown): Promise<WebhookEvent> {
    const record = this.toRecord(payload);
    return deliveryWebhookEventSchema.parse({
      provider: this.provider,
      externalId: this.readString(record, "externalId", "id", "tracking_id"),
      rawStatus: this.readString(record, "status", "event"),
      mappedStatus: this.mapStatus(this.readString(record, "status", "event")),
      occurredAt: this.readOptionalString(record, "occurredAt", "created_at") ?? new Date().toISOString(),
      rawPayload: record,
    });
  }

  async estimateRate(input: RateInput, apiKey: string): Promise<RateResult> {
    const payload = await this.request(this.endpoints.ratePath(input), apiKey, { method: "GET" });
    return rateResultSchema.parse({
      provider: this.provider,
      priceMAD: this.readNumber(payload, "priceMAD", "price_mad", "amount"),
      etaDaysMin: this.readNumber(payload, "etaDaysMin", "eta_min", "eta_days_min"),
      etaDaysMax: this.readNumber(payload, "etaDaysMax", "eta_max", "eta_days_max"),
      rawPayload: this.toRecord(payload),
    });
  }

  private async request(
    path: string,
    apiKey: string,
    init: { method: "GET" | "POST"; body?: unknown },
  ): Promise<unknown> {
    const response = await fetch(new URL(path, this.baseUrl), {
      method: init.method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`${this.provider} request failed with ${response.status}`);
    }
    const payload: unknown = await response.json();
    return payload;
  }

  private mapStatus(status: string): TrackingStatus["mappedStatus"] {
    const normalized = status.toLowerCase();
    if (normalized.includes("pickup")) return "pickup";
    if (normalized.includes("transit") || normalized.includes("route")) return "in_transit";
    if (normalized.includes("deliver")) return "delivered";
    if (normalized.includes("return")) return "returned";
    if (normalized.includes("cancel")) return "cancelled";
    return "unknown";
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    throw new Error(`${this.provider} payload must be an object`);
  }

  private readString(value: unknown, ...keys: string[]): string {
    const record = this.toRecord(value);
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.length > 0) return candidate;
    }
    throw new Error(`${this.provider} payload is missing ${keys.join(" or ")}`);
  }

  private readOptionalString(value: unknown, ...keys: string[]): string | undefined {
    const record = this.toRecord(value);
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.length > 0) return candidate;
    }
    return undefined;
  }

  private readNumber(value: unknown, ...keys: string[]): number {
    const candidate = this.readOptionalNumber(value, ...keys);
    if (candidate === undefined) {
      throw new Error(`${this.provider} payload is missing ${keys.join(" or ")}`);
    }
    return candidate;
  }

  private readOptionalNumber(value: unknown, ...keys: string[]): number | undefined {
    const record = this.toRecord(value);
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "number") return candidate;
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return undefined;
  }
}
