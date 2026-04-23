import { request } from "undici";
import { setTimeout as delay } from "node:timers/promises";
import type { NormalizedProduct, Scraper } from "../types";
import { inferStyles } from "../styles";

// =====================================================================
// Scraper Mobilia (mobilia.ma) — boutique Shopify.
// On utilise l'API publique Shopify /collections/{handle}/products.json
// plutôt qu'un scraping HTML fragile. Format stable, pagination ?page=N,
// limite 250 items/page par convention Shopify.
// =====================================================================

const USER_AGENT =
  "UrdekoBot/1.0 (+https://urdeko.app/robots ; contact=hello@urdeko.app)";

// Mapping : handle collection Shopify → catégorie UrdeKo.
const TARGETS: Array<{ category: NormalizedProduct["category"]; handle: string }> = [
  { category: "canape", handle: "canape-sofa" },
  { category: "canape", handle: "canapes-lits" },
  { category: "table_basse", handle: "tables-basses" },
  { category: "meuble_tv", handle: "meuble-tv" },
  { category: "tapis", handle: "tapis" },
  { category: "luminaire", handle: "luminaires" },
  { category: "decoration", handle: "decoration" },
];

const DELAY_BETWEEN_REQUESTS_MS = 1000;
const MAX_PAGES = 5;

type ShopifyImage = { src: string };
type ShopifyVariant = { price: string; available?: boolean };
type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  tags?: string[];
  images: ShopifyImage[];
  variants: ShopifyVariant[];
};

async function fetchCollectionPage(
  handle: string,
  page: number,
): Promise<ShopifyProduct[]> {
  const url = `https://mobilia.ma/collections/${encodeURIComponent(handle)}/products.json?limit=250&page=${page}`;
  try {
    const res = await request(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/json",
      },
      bodyTimeout: 20_000,
      headersTimeout: 20_000,
    });
    if (res.statusCode !== 200) return [];
    const data = (await res.body.json()) as { products?: ShopifyProduct[] };
    return data.products ?? [];
  } catch {
    return [];
  }
}

function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priceToMad(raw: string | undefined): number {
  if (!raw) return NaN;
  // Shopify renvoie "1299.00" en MAD pour mobilia.ma.
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.round(parsed);
}

function normalize(
  p: ShopifyProduct,
  category: NormalizedProduct["category"],
): NormalizedProduct | null {
  const image = p.images[0]?.src;
  const variant = p.variants[0];
  const priceMad = priceToMad(variant?.price);
  if (!image || !priceMad || priceMad <= 0) return null;

  const description = stripHtml(p.body_html).slice(0, 500);
  const combined = `${p.title} ${description} ${(p.tags ?? []).join(" ")}`;

  return {
    externalId: `mobilia:${p.handle}`,
    name: p.title.trim(),
    brand: "Mobilia",
    category,
    priceMad,
    imageUrl: image,
    sourceUrl: `https://mobilia.ma/products/${p.handle}`,
    description: description || undefined,
    styles: inferStyles(combined),
    tags: (p.tags ?? []).slice(0, 10),
  };
}

export const mobiliaScraper: Scraper = {
  name: "mobilia",
  async run() {
    const all: NormalizedProduct[] = [];
    for (const target of TARGETS) {
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const products = await fetchCollectionPage(target.handle, page);
        if (products.length === 0) break;
        const normalized = products
          .map((p) => normalize(p, target.category))
          .filter((p): p is NormalizedProduct => p !== null);
        all.push(...normalized);
        console.info(
          `[mobilia] ${target.handle} p${page}: ${normalized.length}/${products.length}`,
        );
        await delay(DELAY_BETWEEN_REQUESTS_MS);
        if (products.length < 250) break;
      }
    }
    return all;
  },
};
