import { z } from "zod";
import {
  citySchema,
  cuidSchema,
  e164PhoneSchema,
  isoDateStringSchema,
  madCentsSchema,
  nonEmptyStringSchema,
} from "./common";
import { deliveryProviderSchema } from "./enums";

export const deliverySchema = z.object({
  id: cuidSchema,
  orderId: cuidSchema,
  provider: deliveryProviderSchema,
  externalId: z.string().nullable(),
  trackingUrl: z.string().url().nullable(),
  pickupAt: isoDateStringSchema.nullable(),
  deliveredAt: isoDateStringSchema.nullable(),
  cashCollectedMAD: madCentsSchema.nullable(),
  cashRemittedAt: isoDateStringSchema.nullable(),
  status: nonEmptyStringSchema,
  rawPayload: z.record(z.unknown()).nullable(),
});

export const deliveryAddressSchema = z.object({
  fullName: nonEmptyStringSchema.max(120),
  phoneE164: e164PhoneSchema,
  city: citySchema,
  addressLine: nonEmptyStringSchema.max(240),
  notes: z.string().max(1000).optional(),
});

export const createShipmentInputSchema = z.object({
  orderId: cuidSchema,
  reference: nonEmptyStringSchema,
  provider: deliveryProviderSchema,
  pickupCity: citySchema,
  destination: deliveryAddressSchema,
  cashToCollectMAD: madCentsSchema,
  weightGrams: z.number().int().min(1).max(30000).default(500),
});

export const shipmentResultSchema = z.object({
  externalId: nonEmptyStringSchema,
  trackingUrl: z.string().url().optional(),
  rawStatus: nonEmptyStringSchema,
  rawPayload: z.record(z.unknown()),
});

export const trackingStatusSchema = z.object({
  externalId: nonEmptyStringSchema,
  rawStatus: nonEmptyStringSchema,
  mappedStatus: z.enum(["pickup", "in_transit", "delivered", "returned", "cancelled", "unknown"]),
  deliveredAt: isoDateStringSchema.optional(),
  cashCollectedMAD: madCentsSchema.optional(),
  rawPayload: z.record(z.unknown()),
});

export const deliveryWebhookEventSchema = z.object({
  provider: deliveryProviderSchema,
  externalId: nonEmptyStringSchema,
  rawStatus: nonEmptyStringSchema,
  mappedStatus: trackingStatusSchema.shape.mappedStatus,
  occurredAt: isoDateStringSchema,
  rawPayload: z.record(z.unknown()),
});

export const rateInputSchema = z.object({
  provider: deliveryProviderSchema,
  fromCity: citySchema,
  toCity: citySchema,
  weightGrams: z.number().int().min(1).max(30000),
});

export const rateResultSchema = z.object({
  provider: deliveryProviderSchema,
  priceMAD: madCentsSchema,
  etaDaysMin: z.number().int().min(0),
  etaDaysMax: z.number().int().min(0),
  rawPayload: z.record(z.unknown()),
});

export type Delivery = z.infer<typeof deliverySchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentInputSchema>;
export type ShipmentResult = z.infer<typeof shipmentResultSchema>;
export type TrackingStatus = z.infer<typeof trackingStatusSchema>;
export type WebhookEvent = z.infer<typeof deliveryWebhookEventSchema>;
export type RateInput = z.infer<typeof rateInputSchema>;
export type RateResult = z.infer<typeof rateResultSchema>;
