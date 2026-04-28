import { z } from "zod";

export const cuidSchema = z.string().min(8);
export const emailSchema = z.string().email();
export const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone must be E.164");
export const slugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");
export const madCentsSchema = z.number().int().nonnegative();
export const isoDateStringSchema = z.string().datetime();
export const citySchema = z.string().min(2).max(80);
export const nonEmptyStringSchema = z.string().trim().min(1);

export const paginationInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const paginatedResultSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export type PaginationInput = z.infer<typeof paginationInputSchema>;
