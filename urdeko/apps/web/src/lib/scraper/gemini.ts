import { load } from "cheerio";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";
import { brandFromHost, resolveUrl } from "./fetch";
import { convertToMad, detectCategory, detectStyles } from "./categorize";
import type { ExtractedProduct } from "./types";

// =====================================================================
// Fallback ultime : on demande à Gemini d'extraire les produits depuis
// le HTML nettoyé. Coûteux, donc utilisé seulement quand JSON-LD et OG
// échouent tous les deux.
//
// Nettoyage : on vire scripts/styles/nav/footer pour limiter les tokens.
// =====================================================================

let _ai: GoogleGenAI | null = null;
function ai() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _ai;
}

export async function extractProductsWithGemini(
  html: string,
  baseUrl: string,
): Promise<ExtractedProduct[]> {
  const trimmed = trimHtml(html);
  if (trimmed.length < 200) return [];

  const prompt = `Tu es un assistant qui extrait des produits e-commerce depuis un HTML nettoyé.
Contexte : c'est une boutique de mobilier/décoration, potentiellement une page produit unique
OU une page listing avec plusieurs produits.

Page source : ${baseUrl}

Réponds UNIQUEMENT avec un JSON valide de la forme :
{
  "products": [
    {
      "name": "string (nom du produit tel qu'affiché)",
      "priceText": "string (le prix tel qu'affiché, incluant la devise)",
      "imageUrl": "string (URL absolue ou relative de l'image principale)",
      "productUrl": "string (URL absolue ou relative de la fiche produit)",
      "description": "string courte (max 300 car)"
    }
  ]
}

Règles :
- N'invente rien, si une info manque, mets une chaîne vide.
- Ignore les blocs "produits similaires", "vus récemment", les blogs, les catégories.
- Pour une page produit unique : 1 seul élément dans "products".
- Pour un listing : jusqu'à 24 produits visibles.
- Si aucun produit n'est détectable, renvoie { "products": [] }.

HTML :
"""${trimmed}"""`;

  const res = await ai().models.generateContent({
    model: env.GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const text = res.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) return [];

  let parsed: { products?: Array<Record<string, string>> };
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const raw = parsed.products ?? [];
  const out: ExtractedProduct[] = [];
  for (const p of raw) {
    const name = (p.name ?? "").trim();
    const price = parsePriceLoose(p.priceText ?? "");
    const image = (p.imageUrl ?? "").trim();
    const productUrl = (p.productUrl ?? baseUrl).trim();
    if (!name || !image || price == null) continue;

    const description = (p.description ?? "").trim();
    const absImage = resolveUrl(baseUrl, image) ?? image;
    const absSource = resolveUrl(baseUrl, productUrl) ?? baseUrl;

    out.push({
      externalId: stableId(absSource + "#" + name),
      name,
      brand: brandFromHost(baseUrl),
      category: detectCategory([name, description]),
      priceMad: convertToMad(price.amount, price.currency),
      currency: price.currency,
      imageUrl: absImage,
      sourceUrl: absSource,
      description,
      styles: detectStyles([name, description]),
      tags: [],
      rawSource: "gemini",
    });
  }
  return out;
}

function trimHtml(html: string): string {
  const $ = load(html);
  $("script, style, noscript, nav, footer, header, iframe, svg").remove();
  // On coupe à 80 ko pour tenir dans un prompt raisonnable (~20k tokens).
  return $("body").html()?.slice(0, 80_000) ?? "";
}

function parsePriceLoose(raw: string): { amount: number; currency: string } | null {
  if (!raw) return null;
  const m = raw.match(/([\d][\d\s.,]*\d|\d)/);
  if (!m || !m[1]) return null;
  const n = parseFloat(m[1].replace(/\s/g, "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return null;

  const currencyRegexes: Array<[RegExp, string]> = [
    [/(MAD|DHS?|DIRHAMS?|درهم)/i, "MAD"],
    [/(€|EUR)/i, "EUR"],
    [/(\$|USD)/i, "USD"],
    [/(£|GBP)/i, "GBP"],
  ];
  let currency = "MAD";
  for (const [re, code] of currencyRegexes) {
    if (re.test(raw)) {
      currency = code;
      break;
    }
  }
  return { amount: n, currency };
}

function stableId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || `id_${Date.now()}`;
}
