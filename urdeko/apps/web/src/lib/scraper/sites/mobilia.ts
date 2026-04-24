import { setTimeout as delay } from "node:timers/promises";
import type { ExtractedProduct } from "../types";
import { inferStyles } from "../styles";
import type { SiteScraper } from "./types";

// =====================================================================
// Scraper Mobilia (mobilia.ma) — boutique Shopify.
// On utilise l'API publique Shopify /collections/{handle}/products.json
// plutôt qu'un scraping HTML fragile. Format stable, pagination ?page=N,
// limite 250 items/page par convention Shopify.
// =====================================================================

const USER_AGENT =
  "UrdekoBot/1.0 (+https://urdeko.app/robots ; contact=hello@urdeko.app)";

type Category = NonNullable<ExtractedProduct["category"]>;

const TARGETS: Array<{ category: Category; handle: string }> = [
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
const HTTP_TIMEOUT_MS = 20_000;

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: ShopifyProduct[] };
    return data.products ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
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

function normalize(p: ShopifyProduct, category: Category): ExtractedProduct | null {
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
    currency: "MAD",
    imageUrl: image,
    sourceUrl: `https://mobilia.ma/products/${p.handle}`,
    description: description || "",
    styles: inferStyles(combined),
    tags: (p.tags ?? []).slice(0, 10),
    rawSource: "heuristic",
  };
}

export const mobiliaScraper: SiteScraper = {
  name: "mobilia",
  async run() {
    const all: ExtractedProduct[] = [];
    for (const target of TARGETS) {
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const products = await fetchCollectionPage(target.handle, page);
        if (products.length === 0) break;
        const normalized = products
          .map((p) => normalize(p, target.category))
          .filter((p): p is ExtractedProduct => p !== null);
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
