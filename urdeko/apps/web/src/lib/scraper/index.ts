import { fetchHtml, ScrapeFetchError } from "./fetch";
import { extractProductsFromJsonLd, extractListingUrlsFromJsonLd } from "./jsonld";
import { extractProductFromOpenGraph } from "./opengraph";
import { extractListingUrlsHeuristic } from "./listing";
import { extractProductsWithGemini } from "./gemini";
import type { DetectionResult, ExtractedProduct } from "./types";

// =====================================================================
// Orchestrateur du scraper universel.
//
// Stratégie en cascade :
//   1) JSON-LD Product           → single product (source "jsonld")
//   2) JSON-LD ItemList          → fetch des enfants (source "jsonld")
//   3) Sélecteurs CMS listing    → fetch des enfants (source "heuristic")
//   4) OpenGraph product         → single product (source "opengraph")
//   5) Gemini LLM fallback       → best effort (source "gemini")
//
// Limites : on scrape jusqu'à MAX_PRODUCTS produits par appel.
// =====================================================================

const MAX_PRODUCTS = 24;
const MAX_CONCURRENT = 4;

export async function detectAndExtract(url: string): Promise<DetectionResult> {
  const warnings: string[] = [];
  let pageHtml: string;
  let finalUrl: string;
  try {
    const fetched = await fetchHtml(url);
    pageHtml = fetched.html;
    finalUrl = fetched.finalUrl;
  } catch (err) {
    const msg = err instanceof ScrapeFetchError ? err.message : (err as Error).message;
    return {
      pageType: "unknown",
      products: [],
      warnings: [`Fetch impossible : ${msg}`],
      source: "jsonld",
      fetchedUrl: url,
    };
  }

  // ---- 1) JSON-LD Product direct ----------------------------------
  const direct = extractProductsFromJsonLd(pageHtml, finalUrl);
  if (direct.length === 1) {
    return finalize({
      pageType: "product",
      products: direct,
      warnings,
      source: "jsonld",
      fetchedUrl: finalUrl,
    });
  }
  if (direct.length > 1) {
    return finalize({
      pageType: "listing",
      products: direct.slice(0, MAX_PRODUCTS),
      warnings,
      source: "jsonld",
      fetchedUrl: finalUrl,
    });
  }

  // ---- 2) JSON-LD ItemList -----------------------------------------
  const jsonLdUrls = extractListingUrlsFromJsonLd(pageHtml, finalUrl);
  if (jsonLdUrls.length > 0) {
    const products = await crawlProductPages(jsonLdUrls.slice(0, MAX_PRODUCTS), warnings);
    if (products.length > 0) {
      return finalize({
        pageType: "listing",
        products,
        warnings,
        source: "jsonld",
        fetchedUrl: finalUrl,
      });
    }
  }

  // ---- 3) Heuristique CMS listing ----------------------------------
  const heuristicUrls = extractListingUrlsHeuristic(pageHtml, finalUrl);
  if (heuristicUrls.length > 0) {
    const products = await crawlProductPages(heuristicUrls.slice(0, MAX_PRODUCTS), warnings);
    if (products.length > 0) {
      return finalize({
        pageType: "listing",
        products,
        warnings,
        source: "heuristic",
        fetchedUrl: finalUrl,
      });
    }
    warnings.push(
      `Détecté ${heuristicUrls.length} liens produits mais l'extraction a échoué. Essaie Gemini en fallback.`,
    );
  }

  // ---- 4) OpenGraph single -----------------------------------------
  const og = extractProductFromOpenGraph(pageHtml, finalUrl);
  if (og) {
    return finalize({
      pageType: "product",
      products: [og],
      warnings,
      source: "opengraph",
      fetchedUrl: finalUrl,
    });
  }

  // ---- 5) Fallback Gemini ------------------------------------------
  try {
    const geminiProducts = await extractProductsWithGemini(pageHtml, finalUrl);
    if (geminiProducts.length > 0) {
      return finalize({
        pageType: geminiProducts.length > 1 ? "listing" : "product",
        products: geminiProducts.slice(0, MAX_PRODUCTS),
        warnings: [...warnings, "Extraction par IA Gemini (aucun schéma structuré trouvé)."],
        source: "gemini",
        fetchedUrl: finalUrl,
      });
    }
  } catch (err) {
    warnings.push(`Gemini a échoué : ${(err as Error).message}`);
  }

  return {
    pageType: "unknown",
    products: [],
    warnings: [
      ...warnings,
      "Aucun produit détecté : ni JSON-LD, ni OpenGraph, ni sélecteurs CMS connus, ni IA.",
    ],
    source: "jsonld",
    fetchedUrl: finalUrl,
  };
}

async function crawlProductPages(
  urls: string[],
  warnings: string[],
): Promise<ExtractedProduct[]> {
  const results: ExtractedProduct[] = [];
  // petit worker pool pour limiter la charge
  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    const batch = urls.slice(i, i + MAX_CONCURRENT);
    const chunk = await Promise.all(
      batch.map(async (u) => {
        try {
          const { html, finalUrl } = await fetchHtml(u);
          const got = extractProductsFromJsonLd(html, finalUrl);
          if (got[0]) return got[0];
          return extractProductFromOpenGraph(html, finalUrl);
        } catch (err) {
          warnings.push(`Erreur sur ${u} : ${(err as Error).message}`);
          return null;
        }
      }),
    );
    for (const p of chunk) if (p) results.push(p);
  }
  return results;
}

function finalize(r: DetectionResult): DetectionResult {
  // Déduplique par externalId
  const seen = new Map<string, ExtractedProduct>();
  for (const p of r.products) {
    if (!seen.has(p.externalId)) seen.set(p.externalId, p);
  }
  return { ...r, products: Array.from(seen.values()) };
}

export type { DetectionResult, ExtractedProduct } from "./types";
