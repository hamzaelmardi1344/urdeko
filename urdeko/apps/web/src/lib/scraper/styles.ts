// =====================================================================
// Détection du style d'un produit à partir de son titre/description/tags.
// Heuristique simple et déterministe. Si un produit scrapé correspond à
// plusieurs styles, on les cumule — le scoring produit côté app se
// chargera du classement final.
// =====================================================================

import type { StyleId } from "../domain";

const RULES: Array<{ style: StyleId; keywords: string[] }> = [
  {
    style: "japandi",
    keywords: ["japandi", "bois clair", "cannage", "zen", "nordique", "scandinave"],
  },
  {
    style: "minimaliste",
    keywords: ["minimaliste", "épuré", "epure", "sobre", "pur", "lignes droites"],
  },
  {
    style: "moderne",
    keywords: ["moderne", "design", "contemporain", "lignes", "géométrique"],
  },
  {
    style: "contemporain",
    keywords: ["contemporain", "tendance", "urban", "city", "loft"],
  },
  {
    style: "chaleureux",
    keywords: [
      "chaleureux",
      "cosy",
      "velours",
      "cocon",
      "bouclette",
      "beige",
      "terracotta",
      "ocre",
      "laine",
      "berb",
      "azilal",
      "beni",
    ],
  },
  {
    style: "elegant",
    keywords: [
      "élégant",
      "elegant",
      "laiton",
      "marbre",
      "chic",
      "raffiné",
      "premium",
      "luxe",
      "doré",
    ],
  },
];

export function inferStyles(text: string): StyleId[] {
  const haystack = text.toLowerCase();
  const matched = new Set<StyleId>();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) {
      matched.add(rule.style);
    }
  }
  return Array.from(matched);
}
