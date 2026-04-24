import { load } from "cheerio";
import { setTimeout as delay } from "node:timers/promises";
import type { ExtractedProduct } from "../types";
import { inferStyles } from "../styles";
import type { SiteScraper } from "./types";

// =====================================================================
// Scraper Kitea (kitea.com) — Magento 2 storefront.
// DOM observé (avril 2026) :
//   - Liste : li.item.product.product-item
//   - Titre : h2.product-item-titre (ou a.product-item-link)
//   - Prix  : span[data-price-amount] (data-price-amount="18995") + .price
//   - Image : picture.product-image-photo img[src]
//   - Lien  : a.product-item-link[href]
// Pagination : ?p=N (next : li.pages-item-next > a)
// =====================================================================

const USER_AGENT =
  "UrdekoBot/1.0 (+https://urdeko.app/robots ; contact=hello@urdeko.app)";

type Category = NonNullable<ExtractedProduct["category"]>;

const TARGETS: Array<{ category: Category; url: string }> = [
  {
    category: "canape",
    url: "https://www.kitea.com/par-espaces/salon-et-sejour/canapes-et-sofas.html",
  },
  {
    category: "table_basse",
    url: "https://www.kitea.com/par-espaces/salon-et-sejour/tables-basses.html",
  },
  {
    category: "meuble_tv",
    url: "https://www.kitea.com/par-espaces/salon-et-sejour/meubles-tv.html",
  },
  {
    category: "tapis",
    url: "https://www.kitea.com/par-espaces/decoration/tapis.html",
  },
  {
    category: "luminaire",
    url: "https://www.kitea.com/par-espaces/decoration/luminaires.html",
  },
  {
    category: "decoration",
    url: "https://www.kitea.com/par-espaces/decoration/objets-deco.html",
  },
];

const MAX_PAGES_PER_CATEGORY = 5;
const DELAY_BETWEEN_REQUESTS_MS = 1500;
const HTTP_TIMEOUT_MS = 30_000;

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fr-FR,fr;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parsePage(
  html: string,
  category: Category,
): { products: ExtractedProduct[]; nextUrl: string | null } {
  const $ = load(html);
  const products: ExtractedProduct[] = [];

  $("li.item.product.product-item").each((_, el) => {
    const node = $(el);
    const link = node.find("a.product-item-link").first();
    const sourceUrl = link.attr("href") ?? "";
    const name =
      node.find(".product-item-titre").first().text().trim() ||
      link.text().trim();

    const priceNode = node.find("span[data-price-amount]").first();
    const priceAttr = priceNode.attr("data-price-amount");
    const priceMad = priceAttr ? Math.round(Number(priceAttr)) : NaN;

    const img =
      node.find("picture.product-image-photo img").attr("src") ??
      node.find(".product-image-photo img").attr("src") ??
      "";

    if (!name || !sourceUrl || !priceMad || !img) return;

    const externalId = sourceUrl
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\.html.*$/, "")
      .replace(/[^a-z0-9_-]/gi, "_");

    products.push({
      externalId: `kitea:${externalId}`,
      name,
      brand: "Kitea",
      category,
      priceMad,
      currency: "MAD",
      imageUrl: img.startsWith("http") ? img : `https://www.kitea.com${img}`,
      sourceUrl,
      description: "",
      styles: inferStyles(name),
      tags: [],
      rawSource: "heuristic",
    });
  });

  const nextHref = $("li.pages-item-next > a").attr("href") ?? null;
  return { products, nextUrl: nextHref };
}

export const kiteaScraper: SiteScraper = {
  name: "kitea",
  async run() {
    const all: ExtractedProduct[] = [];
    for (const target of TARGETS) {
      let url: string | null = target.url;
      let page = 0;
      while (url && page < MAX_PAGES_PER_CATEGORY) {
        page += 1;
        const html: string | null = await fetchHtml(url);
        if (!html) {
          console.warn(`[kitea] ${url} unreachable, skip.`);
          break;
        }
        const { products, nextUrl } = parsePage(html, target.category);
        all.push(...products);
        console.info(
          `[kitea] ${target.category} p${page}: ${products.length} produits`,
        );
        url = nextUrl;
        await delay(DELAY_BETWEEN_REQUESTS_MS);
      }
    }
    return all;
  },
};
