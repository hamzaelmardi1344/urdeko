import { z } from "zod";
import { citySchema, cuidSchema, e164PhoneSchema, isoDateStringSchema, slugSchema } from "./common";
import { localeSchema, planSchema, shopStatusSchema } from "./enums";

export const userSchema = z.object({
  id: cuidSchema,
  clerkId: z.string().min(1),
  email: z.string().email(),
  phoneE164: e164PhoneSchema.nullable(),
  fullName: z.string().min(1),
  locale: localeSchema,
  createdAt: isoDateStringSchema,
});

export const shopSchema = z.object({
  id: cuidSchema,
  ownerId: cuidSchema,
  slug: slugSchema,
  name: z.string().min(2).max(80),
  bio: z.string().max(280).nullable(),
  logoUrl: z.string().url().nullable(),
  coverUrl: z.string().url().nullable(),
  whatsappNumber: e164PhoneSchema,
  instagramHandle: z.string().max(80).nullable(),
  city: citySchema,
  plan: planSchema,
  planSince: isoDateStringSchema,
  monthlyOrderQuota: z.number().int().nonnegative(),
  status: shopStatusSchema,
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
});

export const createShopInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  city: citySchema,
  whatsappNumber: e164PhoneSchema,
  instagramHandle: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(280).optional(),
  logoUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
});

export const updateShopInputSchema = createShopInputSchema.partial().extend({
  id: cuidSchema,
});

export function canCreateOrderForPlan(input: {
  plan: z.infer<typeof planSchema>;
  monthlyOrderQuota: number;
  ordersThisMonth: number;
}): boolean {
  if (input.plan !== "FREE") {
    return true;
  }
  return input.ordersThisMonth < input.monthlyOrderQuota;
}

export type User = z.infer<typeof userSchema>;
export type Shop = z.infer<typeof shopSchema>;
export type CreateShopInput = z.infer<typeof createShopInputSchema>;
export type UpdateShopInput = z.infer<typeof updateShopInputSchema>;
