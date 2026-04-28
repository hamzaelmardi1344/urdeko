import { z } from "zod";
import {
  citySchema,
  cuidSchema,
  e164PhoneSchema,
  isoDateStringSchema,
  madCentsSchema,
  nonEmptyStringSchema,
} from "./common";

export const customerSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  fullName: nonEmptyStringSchema.max(120),
  phoneE164: e164PhoneSchema,
  city: citySchema,
  addressLine: nonEmptyStringSchema.max(240),
  notes: z.string().max(1000).nullable(),
  totalOrders: z.number().int().nonnegative(),
  totalSpentMAD: madCentsSchema,
  createdAt: isoDateStringSchema,
});

export const createCustomerInputSchema = z.object({
  fullName: nonEmptyStringSchema.max(120),
  phoneE164: e164PhoneSchema,
  city: citySchema,
  addressLine: nonEmptyStringSchema.max(240),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerInputSchema = createCustomerInputSchema.partial().extend({
  id: cuidSchema,
});

export const customerSegmentSchema = z.enum(["VIP", "LOYAL", "NEW", "DORMANT"]);

export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;
export type CustomerSegment = z.infer<typeof customerSegmentSchema>;
