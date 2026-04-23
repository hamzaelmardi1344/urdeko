import { z } from "zod";
import type { ElementCategoryId } from "@/lib/domain";

// =====================================================================
// Types du scraper universel. Contrairement à apps/scraper (qui cible
// des marques précises), ici on extrait depuis n'importe quelle URL.
// =====================================================================

export type ExtractionSource = "jsonld" | "opengraph" | "heuristic" | "gemini";

export type ExtractedProduct = {
  externalId: string; // ID stable pour dédup (SKU ou hash URL)
  name: string;
  brand: string; // déduit du domaine si non explicite
  category: ElementCategoryId | null; // null = à reviewer manuellement
  priceMad: number;
  currency: string; // "MAD" par défaut si non trouvé
  imageUrl: string;
  sourceUrl: string;
  description: string;
  // Laxe sur le typage : certaines boutiques utilisent des styles non-UrdeKo,
  // l'admin peut corriger à la main. Les helpers detectStyles() ne sortiront
  // que des StyleId valides, mais on accepte aussi des customs.
  styles: string[];
  tags: string[];
  rawSource: ExtractionSource;
};

export const extractedProductSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(300),
  brand: z.string().min(1).max(100),
  category: z
    .enum(["canape", "table_basse", "tapis", "luminaire", "decoration", "meuble_tv"])
    .nullable(),
  priceMad: z.number().int().positive(),
  currency: z.string().min(1).max(8),
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  description: z.string().default(""),
  styles: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  rawSource: z.enum(["jsonld", "opengraph", "heuristic", "gemini"]),
});

export type DetectionResult = {
  pageType: "product" | "listing" | "unknown";
  products: ExtractedProduct[];
  warnings: string[];
  source: ExtractionSource;
  fetchedUrl: string;
};
