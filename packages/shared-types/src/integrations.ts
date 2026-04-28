import { z } from "zod";
import { cuidSchema, isoDateStringSchema, madCentsSchema, nonEmptyStringSchema } from "./common";
import { planSchema, whatsappTemplateTypeSchema } from "./enums";

export const whatsappTemplateSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema.nullable(),
  type: whatsappTemplateTypeSchema,
  language: z.enum(["fr", "ar", "darija"]),
  body: nonEmptyStringSchema.max(1024),
  active: z.boolean(),
});

export const updateWhatsappTemplateInputSchema = z.object({
  id: cuidSchema,
  body: nonEmptyStringSchema.max(1024),
  active: z.boolean(),
});

export const instagramMediaSchema = z.object({
  id: nonEmptyStringSchema,
  mediaType: z.enum(["IMAGE", "CAROUSEL_ALBUM"]),
  caption: z.string().default(""),
  mediaUrl: z.string().url(),
  permalink: z.string().url(),
  timestamp: isoDateStringSchema,
});

export const aiProductCopyInputSchema = z.object({
  imageUrl: z.string().url().optional(),
  category: z.string().min(2).max(80),
  priceMAD: madCentsSchema,
  keywords: z.array(z.string().min(1).max(40)).min(1).max(3),
});

export const aiProductCopySchema = z.object({
  title_fr: nonEmptyStringSchema.max(140),
  title_ar: z.string().max(140),
  description_fr: nonEmptyStringSchema.max(1200),
  description_darija: nonEmptyStringSchema.max(1200),
  hashtags_suggested: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u)).max(20),
});

export const subscriptionSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  paddleSubId: nonEmptyStringSchema,
  plan: planSchema,
  status: nonEmptyStringSchema,
  renewsAt: isoDateStringSchema.nullable(),
  cancelledAt: isoDateStringSchema.nullable(),
  createdAt: isoDateStringSchema,
});

export const analyticsSnapshotSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  date: isoDateStringSchema,
  orders: z.number().int().nonnegative(),
  revenue: madCentsSchema,
  newCustomers: z.number().int().nonnegative(),
  topProductId: cuidSchema.nullable(),
});

export type WhatsappTemplate = z.infer<typeof whatsappTemplateSchema>;
export type UpdateWhatsappTemplateInput = z.infer<typeof updateWhatsappTemplateInputSchema>;
export type InstagramMedia = z.infer<typeof instagramMediaSchema>;
export type AiProductCopyInput = z.infer<typeof aiProductCopyInputSchema>;
export type AiProductCopy = z.infer<typeof aiProductCopySchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;
