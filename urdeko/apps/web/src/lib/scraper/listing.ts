import { load } from "cheerio";
import { resolveUrl } from "./fetch";

// =====================================================================
// Détection de liens produits sur une page "listing" (catégorie).
// Stratégie :
//   1) JSON-LD ItemList — géré séparément dans jsonld.ts (prioritaire).
//   2) Sélecteurs CMS connus (WooCommerce, Shopify, Magento, Prestashop).
//   3) Fallback brut : tout lien `a[href]` qui ressemble à une fiche produit.
// =====================================================================

const CMS_SELECTORS = [
  // WooCommerce
  "a.woocommerce-loop-product__link[href]",
  "li.product a.product-link[href]",
  "ul.products li.product a[href]",
  // Shopify
  "a.product-card__link[href]",
  "a.grid-product__link[href]",
  "a.product-item__link[href]",
  // Magento
  "a.product-item-link[href]",
  "li.product-item a[href]",
  // Prestashop
  "a.product-thumbnail[href]",
  "article.product-miniature a.thumbnail[href]",
  // Générique e-commerce
  "a[itemprop=\"url\"][href]",
  "a[data-product-url][href]",
];

export function extractListingUrlsHeuristic(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const urls = new Set<string>();

  for (const selector of CMS_SELECTORS) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const abs = resolveUrl(baseUrl, href);
      if (abs) urls.add(abs);
    });
    if (urls.size > 0) break; // premier sélecteur qui matche = probablement bon CMS
  }

  if (urls.size === 0) {
    // Fallback très prudent : liens qui contiennent /produit/ ou /product/
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      if (!/\/(produit|product|item|p)\//i.test(href)) return;
      const abs = resolveUrl(baseUrl, href);
      if (abs) urls.add(abs);
    });
  }

  return Array.from(urls);
}

export function extractNextPageUrl(html: string, baseUrl: string): string | null {
  const $ = load(html);
  // link rel="next" standard
  const relNext = $("link[rel=\"next\"], a[rel=\"next\"]").attr("href");
  if (relNext) return resolveUrl(baseUrl, relNext);
  // WooCommerce .next > a
  const wooNext = $("a.next.page-numbers[href]").attr("href");
  if (wooNext) return resolveUrl(baseUrl, wooNext);
  // Magento pagination
  const mageNext = $("li.pages-item-next > a[href]").attr("href");
  if (mageNext) return resolveUrl(baseUrl, mageNext);
  return null;
}
