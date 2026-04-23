import { load } from "cheerio";
import { request } from "undici";
import { setTimeout as delay } from "node:timers/promises";
import type { NormalizedProduct, Scraper } from "../types";
import { inferStyles } from "../styles";

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

const TARGETS: Array<{ category: NormalizedProduct["category"]; url: string }> = [
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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await request(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fr-FR,fr;q=0.9",
      },
      maxRedirections: 3,
      bodyTimeout: 30_000,
      headersTimeout: 30_000,
    });
    if (res.statusCode !== 200) return null;
    return await res.body.text();
  } catch {
    return null;
  }
}

function parsePage(
  html: string,
  category: NormalizedProduct["category"],
): { products: NormalizedProduct[]; nextUrl: string | null } {
  const $ = load(html);
  const products: NormalizedProduct[] = [];

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
      imageUrl: img.startsWith("http") ? img : `https://www.kitea.com${img}`,
      sourceUrl,
      styles: inferStyles(name),
      tags: [],
    });
  });

  const nextHref = $("li.pages-item-next > a").attr("href") ?? null;
  return { products, nextUrl: nextHref };
}

export const kiteaScraper: Scraper = {
  name: "kitea",
  async run() {
    const all: NormalizedProduct[] = [];
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
