import { z } from "zod";

export const normalizedProductSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  brand: z.enum(["Kitea", "Mobilia"]),
  category: z.enum([
    "canape",
    "table_basse",
    "tapis",
    "luminaire",
    "decoration",
    "meuble_tv",
  ]),
  priceMad: z.number().int().positive(),
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  description: z.string().optional(),
  styles: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;

export type Scraper = {
  name: string;
  run(): Promise<NormalizedProduct[]>;
};
