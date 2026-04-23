import { load } from "cheerio";
import { brandFromHost, resolveUrl } from "./fetch";
import { convertToMad, detectCategory, detectStyles } from "./categorize";
import type { ExtractedProduct } from "./types";

// =====================================================================
// Fallback n°2 : meta tags OpenGraph + meta produit (product:*).
// S'utilise quand le JSON-LD manque. On n'essaie PAS de deviner
// des listes ici (OG n'est défini que pour la page courante).
// =====================================================================

function meta(html: ReturnType<typeof load>, key: string, value: string): string | null {
  const el = html(`meta[${key}="${value}"]`).first();
  if (!el.length) return null;
  const content = el.attr("content");
  return content?.trim() || null;
}

export function extractProductFromOpenGraph(
  html: string,
  baseUrl: string,
): ExtractedProduct | null {
  const $ = load(html);

  const ogType = meta($, "property", "og:type");
  // On reste permissif : beaucoup de shops mettent "website" au lieu de "product"
  const name =
    meta($, "property", "og:title") ??
    meta($, "name", "twitter:title") ??
    ($("title").text().trim() || null);
  const image =
    meta($, "property", "og:image:secure_url") ??
    meta($, "property", "og:image") ??
    meta($, "name", "twitter:image");
  const description =
    meta($, "property", "og:description") ??
    meta($, "name", "description") ??
    "";
  const sourceUrl = meta($, "property", "og:url") ?? baseUrl;

  const priceStr =
    meta($, "property", "product:price:amount") ??
    meta($, "property", "og:price:amount") ??
    $("[itemprop=\"price\"]").first().attr("content") ??
    $("[itemprop=\"price\"]").first().text();
  const currency =
    meta($, "property", "product:price:currency") ??
    meta($, "property", "og:price:currency") ??
    $("[itemprop=\"priceCurrency\"]").first().attr("content") ??
    "MAD";

  const price = parsePriceString(priceStr ?? "");

  if (!name || !image || price == null) return null;

  // Si le type OG est explicitement "product", on a haute confiance.
  // Sinon on renvoie quand même, l'admin validera manuellement.
  const absImage = resolveUrl(baseUrl, image) ?? image;
  const absSource = resolveUrl(baseUrl, sourceUrl) ?? sourceUrl;

  return {
    externalId: stableId(absSource),
    name,
    brand: brandFromHost(baseUrl),
    category: detectCategory([name, description]),
    priceMad: convertToMad(price, currency),
    currency,
    imageUrl: absImage,
    sourceUrl: absSource,
    description,
    styles: detectStyles([name, description]),
    tags: ogType ? [`og:${ogType}`] : [],
    rawSource: "opengraph",
  };
}

function parsePriceString(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stableId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || `id_${Date.now()}`;
}
