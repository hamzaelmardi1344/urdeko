import { z } from "zod";
import { cuidSchema, isoDateStringSchema, madCentsSchema, nonEmptyStringSchema } from "./common";
import { integrationProviderSchema, planSchema, whatsappTemplateTypeSchema } from "./enums";

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

export const shopIntegrationSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  provider: integrationProviderSchema,
  externalAccountId: z.string().nullable(),
  scopes: z.array(z.string()),
  expiresAt: isoDateStringSchema.nullable(),
  connectedAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
});

export const instagramOAuthUrlSchema = z.object({
  url: z.string().url(),
  state: nonEmptyStringSchema,
  redirectUri: z.string().url(),
});

export const connectInstagramInputSchema = z.union([
  z.object({
    code: nonEmptyStringSchema,
    redirectUri: z.string().url(),
  }),
  z.object({
    accessToken: nonEmptyStringSchema,
  }),
]);

export const instagramImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  products: z.array(z.unknown()),
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

export const billingCheckoutInputSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
  customerEmail: z.string().email(),
});

export const billingCheckoutSchema = z.object({
  checkoutUrl: z.string().url(),
  transactionId: nonEmptyStringSchema,
  plan: z.enum(["PRO", "BUSINESS"]),
});

export const productImageUploadInputSchema = z.object({
  fileName: nonEmptyStringSchema.max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  byteSize: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
});

export const productImageUploadSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  headers: z.record(z.string()),
  expiresAt: isoDateStringSchema,
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
export type ShopIntegration = z.infer<typeof shopIntegrationSchema>;
export type InstagramOAuthUrl = z.infer<typeof instagramOAuthUrlSchema>;
export type ConnectInstagramInput = z.infer<typeof connectInstagramInputSchema>;
export type InstagramImportResult = z.infer<typeof instagramImportResultSchema>;
export type AiProductCopyInput = z.infer<typeof aiProductCopyInputSchema>;
export type AiProductCopy = z.infer<typeof aiProductCopySchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type BillingCheckoutInput = z.infer<typeof billingCheckoutInputSchema>;
export type BillingCheckout = z.infer<typeof billingCheckoutSchema>;
export type ProductImageUploadInput = z.infer<typeof productImageUploadInputSchema>;
export type ProductImageUpload = z.infer<typeof productImageUploadSchema>;
export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;
