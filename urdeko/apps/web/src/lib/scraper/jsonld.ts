import { load, type CheerioAPI } from "cheerio";
import { brandFromHost, resolveUrl } from "./fetch";
import { convertToMad, detectCategory, detectStyles } from "./categorize";
import type { ExtractedProduct } from "./types";

// =====================================================================
// Extracteur JSON-LD (schema.org). Supporte :
//   - Product          → 1 produit
//   - ItemList         → collection (on ne résout pas les URLs ici,
//                         c'est le rôle du listing extractor)
//   - @graph imbriqué  → on déplie récursivement
// =====================================================================

type JsonLdNode = Record<string, unknown>;

function collectNodes($: CheerioAPI): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  $("script[type=\"application/ld+json\"]").each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      pushAll(parsed, nodes);
    } catch {
      // JSON-LD invalide, on ignore silencieusement
    }
  });
  return nodes;
}

function pushAll(value: unknown, out: JsonLdNode[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) pushAll(v, out);
    return;
  }
  if (typeof value !== "object") return;
  const node = value as JsonLdNode;
  if (node["@graph"]) pushAll(node["@graph"], out);
  out.push(node);
}

function isType(node: JsonLdNode, type: string): boolean {
  const t = node["@type"];
  if (t === type) return true;
  if (Array.isArray(t)) return t.includes(type);
  return false;
}

function str(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstImage(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    for (const item of v) {
      const got = firstImage(item);
      if (got) return got;
    }
    return null;
  }
  if (typeof v === "object") {
    const obj = v as JsonLdNode;
    return str(obj.url) ?? str(obj.contentUrl);
  }
  return null;
}

function firstOffer(v: unknown): { price: number | null; currency: string | null } {
  if (!v) return { price: null, currency: null };
  const candidates = Array.isArray(v) ? v : [v];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const offer = raw as JsonLdNode;
    const price = num(offer.price) ?? num(offer.lowPrice) ?? num(offer.highPrice);
    const currency = str(offer.priceCurrency);
    if (price != null) return { price, currency };
  }
  return { price: null, currency: null };
}

export function extractProductsFromJsonLd(
  html: string,
  baseUrl: string,
): ExtractedProduct[] {
  const $ = load(html);
  const nodes = collectNodes($);

  const results: ExtractedProduct[] = [];
  for (const node of nodes) {
    if (!isType(node, "Product")) continue;

    const name = str(node.name);
    const image = firstImage(node.image);
    const { price, currency } = firstOffer(node.offers);
    const sourceUrl =
      (typeof node.offers === "object" && node.offers !== null
        ? str((node.offers as JsonLdNode).url)
        : null) ??
      str(node.url) ??
      baseUrl;

    if (!name || !image || price == null) continue;

    const description = str(node.description) ?? "";
    const sku = str(node.sku) ?? str(node["@id"]) ?? sourceUrl;
    const rawCategory = str(node.category);

    const absoluteImage = resolveUrl(baseUrl, image) ?? image;
    const absoluteSource = resolveUrl(baseUrl, sourceUrl) ?? sourceUrl;

    results.push({
      externalId: stableId(sku),
      name,
      brand: extractBrand(node) ?? brandFromHost(baseUrl),
      category: detectCategory([name, description, rawCategory]),
      priceMad: convertToMad(price, currency ?? "MAD"),
      currency: currency ?? "MAD",
      imageUrl: absoluteImage,
      sourceUrl: absoluteSource,
      description,
      styles: detectStyles([name, description, rawCategory]),
      tags: rawCategory ? [rawCategory] : [],
      rawSource: "jsonld",
    });
  }

  return results;
}

/** Si la page est un ItemList, retourne la liste des URLs produits. */
export function extractListingUrlsFromJsonLd(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const nodes = collectNodes($);

  const urls = new Set<string>();
  for (const node of nodes) {
    if (!isType(node, "ItemList")) continue;
    const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as JsonLdNode;
      const url =
        str(entry.url) ??
        (typeof entry.item === "object" && entry.item !== null
          ? str((entry.item as JsonLdNode).url) ?? str((entry.item as JsonLdNode)["@id"])
          : null);
      if (url) {
        const abs = resolveUrl(baseUrl, url);
        if (abs) urls.add(abs);
      }
    }
  }
  return Array.from(urls);
}

function extractBrand(node: JsonLdNode): string | null {
  const raw = node.brand;
  if (typeof raw === "string") return raw.trim() || null;
  if (raw && typeof raw === "object") {
    return str((raw as JsonLdNode).name);
  }
  return null;
}

function stableId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || `id_${Date.now()}`;
}
