import { Injectable, NotFoundException } from "@nestjs/common";
import {
  assignDeliveryInputSchema,
  createShipmentInputSchema,
  deliveryProviderSchema,
  type DeliveryProvider,
} from "@bep/shared-types";
import { Prisma } from "../../prisma/generated/client";
import { EncryptionService } from "../common/crypto/encryption.service";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { createDeliveryAdapter } from "./adapters/provider-factory";

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly env: EnvService,
  ) {}

  async configure(shopId: string, input: unknown) {
    const parsed = createShipmentInputSchema
      .pick({ provider: true, pickupCity: true })
      .extend({ apiKey: createShipmentInputSchema.shape.reference.min(1) })
      .parse(input);
    return this.prisma.shopDeliveryConfig.upsert({
      where: { shopId_provider: { shopId, provider: parsed.provider } },
      update: {
        apiKeyEnc: this.encryption.encrypt(parsed.apiKey),
        defaultPickupCity: parsed.pickupCity,
        enabled: true,
      },
      create: {
        shopId,
        provider: parsed.provider,
        apiKeyEnc: this.encryption.encrypt(parsed.apiKey),
        defaultPickupCity: parsed.pickupCity,
      },
    });
  }

  async assign(shopId: string, input: unknown) {
    const parsed = assignDeliveryInputSchema.parse(input);
    const order = await this.prisma.order.findFirst({
      where: { id: parsed.orderId, shopId },
      include: { customer: true, shop: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    const config = await this.prisma.shopDeliveryConfig.findUnique({
      where: { shopId_provider: { shopId, provider: parsed.provider } },
    });
    if (!config) throw new NotFoundException("Delivery provider is not configured");
    const adapter = createDeliveryAdapter(parsed.provider, this.env);
    const apiKey = this.encryption.decrypt(config.apiKeyEnc);
    const result = await adapter.createShipment(
      {
        orderId: order.id,
        reference: order.reference,
        provider: parsed.provider,
        pickupCity: config.defaultPickupCity ?? order.shop.city,
        destination: {
          fullName: order.customer.fullName,
          phoneE164: order.customer.phoneE164,
          city: order.customer.city,
          addressLine: order.customer.addressLine,
          notes: order.customer.notes ?? undefined,
        },
        cashToCollectMAD: order.totalMAD,
        weightGrams: 500,
      },
      apiKey,
    );
    return this.prisma.delivery.upsert({
      where: { orderId: order.id },
      update: {
        provider: parsed.provider,
        externalId: result.externalId,
        trackingUrl: result.trackingUrl,
        pickupAt: parsed.pickupAt ? new Date(parsed.pickupAt) : undefined,
        status: result.rawStatus,
        rawPayload: this.toJson(result.rawPayload),
      },
      create: {
        orderId: order.id,
        provider: parsed.provider,
        externalId: result.externalId,
        trackingUrl: result.trackingUrl,
        pickupAt: parsed.pickupAt ? new Date(parsed.pickupAt) : undefined,
        status: result.rawStatus,
        rawPayload: this.toJson(result.rawPayload),
      },
    });
  }

  async handleWebhook(providerValue: string, payload: unknown): Promise<{ ok: true }> {
    const provider = deliveryProviderSchema.parse(providerValue.toUpperCase());
    const adapter = createDeliveryAdapter(provider, this.env);
    const event = await adapter.parseWebhook(payload);
    const delivery = await this.prisma.delivery.findFirst({
      where: { provider, externalId: event.externalId },
      include: { order: true },
    });
    if (!delivery) return { ok: true };
    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: event.rawStatus, rawPayload: this.toJson(event.rawPayload) },
    });
    return { ok: true };
  }

  providerApiKeyFromEnv(provider: DeliveryProvider): string | undefined {
    if (provider === "AMANA") return this.env.get("AMANA_API_KEY");
    if (provider === "SPEEDAF") return this.env.get("SPEEDAF_API_KEY");
    if (provider === "SENDIT") return this.env.get("SENDIT_API_KEY");
    return undefined;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    if (value === null) {
      return "null";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.toJson(item));
    }
    if (typeof value === "object" && value !== null) {
      const output: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, nested] of Object.entries(value)) {
        if (nested !== undefined) {
          output[key] = this.toJson(nested);
        }
      }
      return output;
    }
    return String(value);
  }
}
