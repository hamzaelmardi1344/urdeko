import type { ExtractedProduct } from "../types";

// =====================================================================
// Contrat des scrapers site-spécifiques (Kitea, Mobilia, ...).
// Réutilise le type ExtractedProduct du scraper universel pour que la
// pipeline d'upsert soit la même peu importe la source.
// =====================================================================

export type SiteScraper = {
  name: string;
  run(): Promise<ExtractedProduct[]>;
};
