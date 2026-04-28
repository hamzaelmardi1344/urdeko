import { z } from "zod";
import { cuidSchema, isoDateStringSchema, madCentsSchema, nonEmptyStringSchema } from "./common";
import { productStatusSchema } from "./enums";

export const productImageSchema = z.object({
  id: cuidSchema,
  productId: cuidSchema,
  url: z.string().url(),
  position: z.number().int().nonnegative(),
});

export const productVariantSchema = z.object({
  id: cuidSchema,
  productId: cuidSchema,
  name: nonEmptyStringSchema.max(80),
  sku: z.string().max(80).nullable(),
  priceMAD: madCentsSchema.nullable(),
  stock: z.number().int().nonnegative(),
});

export const productSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  title: nonEmptyStringSchema.max(140),
  titleAr: z.string().max(140).nullable(),
  description: nonEmptyStringSchema.max(5000),
  descriptionAr: z.string().max(5000).nullable(),
  descriptionDarija: z.string().max(5000).nullable(),
  priceMAD: madCentsSchema,
  comparePriceMAD: madCentsSchema.nullable(),
  stock: z.number().int().nonnegative(),
  unlimited: z.boolean(),
  status: productStatusSchema,
  images: z.array(productImageSchema),
  variants: z.array(productVariantSchema),
  sourceInstagramPostId: z.string().nullable(),
  aiGenerated: z.boolean(),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
});

export const upsertProductVariantInputSchema = z.object({
  id: cuidSchema.optional(),
  name: nonEmptyStringSchema.max(80),
  sku: z.string().max(80).optional(),
  priceMAD: madCentsSchema.optional(),
  stock: z.number().int().nonnegative().default(0),
});

export const productImageInputSchema = z.object({
  url: z.string().url(),
  position: z.number().int().nonnegative(),
});

export const createProductInputSchema = z.object({
  title: nonEmptyStringSchema.max(140),
  titleAr: z.string().max(140).optional(),
  description: nonEmptyStringSchema.max(5000),
  descriptionAr: z.string().max(5000).optional(),
  descriptionDarija: z.string().max(5000).optional(),
  priceMAD: madCentsSchema,
  comparePriceMAD: madCentsSchema.optional(),
  stock: z.number().int().nonnegative().default(0),
  unlimited: z.boolean().default(false),
  status: productStatusSchema.default("DRAFT"),
  images: z.array(productImageInputSchema).min(1).max(10),
  variants: z.array(upsertProductVariantInputSchema).max(60).default([]),
  sourceInstagramPostId: z.string().optional(),
  aiGenerated: z.boolean().default(false),
});

export const updateProductInputSchema = createProductInputSchema.partial().extend({
  id: cuidSchema,
});

export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type UpsertProductVariantInput = z.infer<typeof upsertProductVariantInputSchema>;
