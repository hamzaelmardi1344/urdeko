import { z } from "zod";
import { citySchema, e164PhoneSchema, madCentsSchema, nonEmptyStringSchema, slugSchema } from "./common";
import { orderItemInputSchema } from "./order";
import { productSchema } from "./product";
import { shopSchema } from "./shop";

export const publicShopSchema = shopSchema.pick({
  slug: true,
  name: true,
  bio: true,
  logoUrl: true,
  coverUrl: true,
  whatsappNumber: true,
  instagramHandle: true,
  city: true,
  plan: true,
});

export const publicProductSchema = productSchema.pick({
  id: true,
  title: true,
  titleAr: true,
  description: true,
  descriptionAr: true,
  descriptionDarija: true,
  priceMAD: true,
  comparePriceMAD: true,
  unlimited: true,
  status: true,
  images: true,
  variants: true,
});

export const storefrontSchema = z.object({
  shop: publicShopSchema,
  products: z.array(publicProductSchema),
});

export const storefrontCheckoutInputSchema = z.object({
  shopSlug: slugSchema,
  customer: z.object({
    fullName: nonEmptyStringSchema.max(120),
    phoneE164: e164PhoneSchema,
    city: citySchema,
    addressLine: nonEmptyStringSchema.max(240),
    notes: z.string().max(1000).optional(),
  }),
  items: z.array(orderItemInputSchema).min(1).max(100),
  deliveryMAD: madCentsSchema.default(0),
});

export type PublicShop = z.infer<typeof publicShopSchema>;
export type PublicProduct = z.infer<typeof publicProductSchema>;
export type Storefront = z.infer<typeof storefrontSchema>;
export type StorefrontCheckoutInput = z.infer<typeof storefrontCheckoutInputSchema>;
