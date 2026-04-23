import type { ElementCategoryId, StyleId } from "@/lib/domain";

// =====================================================================
// Heuristiques "pauvres homme" pour mapper un nom/description/catégorie
// vendeur vers les catégories et styles d'UrdeKo. Pas d'IA ici, juste
// des mots-clés FR/EN. On sur-reconnaît côté produit (= null accepté).
// =====================================================================

const CATEGORY_RULES: Array<{ id: ElementCategoryId; patterns: RegExp[] }> = [
  {
    id: "canape",
    patterns: [
      /\bcanap[eé]s?\b/i,
      /\bsofa/i,
      /\bfauteuil\b/i,
      /\bm[ée]ridienne\b/i,
      /\bbanquette\b/i,
    ],
  },
  {
    id: "table_basse",
    patterns: [
      /\btable\s+basse\b/i,
      /\bcoffee\s*table\b/i,
      /\bbout\s+de\s+canap[eé]\b/i,
      /\btable\s+d.appoint\b/i,
    ],
  },
  {
    id: "tapis",
    patterns: [/\btapis\b/i, /\brug\b/i, /\bmoquette\b/i, /\bkilim\b/i],
  },
  {
    id: "luminaire",
    patterns: [
      /\blampe\b/i,
      /\blampadaire\b/i,
      /\bsuspension\b/i,
      /\blustre\b/i,
      /\bapplique\b/i,
      /\bplafonnier\b/i,
      /\blight\b/i,
      /\blamp\b/i,
    ],
  },
  {
    id: "meuble_tv",
    patterns: [
      /\bmeuble\s*t[vé]\b/i,
      /\bmeuble\s+t[eé]l[ée]\b/i,
      /\btv\s*stand\b/i,
      /\bmedia\s*console\b/i,
    ],
  },
  {
    id: "decoration",
    patterns: [
      /\bd[ée]coration?\b/i,
      /\bvase\b/i,
      /\bmiroir\b/i,
      /\bobjet\s+d[ée]co\b/i,
      /\bsculpture\b/i,
      /\bcadre\b/i,
      /\bposter\b/i,
      /\bplante\b/i,
    ],
  },
];

export function detectCategory(texts: (string | null | undefined)[]): ElementCategoryId | null {
  const blob = texts.filter(Boolean).join(" · ").toLowerCase();
  if (!blob) return null;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((r) => r.test(blob))) return rule.id;
  }
  return null;
}

const STYLE_RULES: Array<{ id: StyleId; patterns: RegExp[] }> = [
  { id: "moderne", patterns: [/\bmoderne\b/i, /\bmodern\b/i, /\bcontempo(rain|rary)?\b/i] },
  {
    id: "contemporain",
    patterns: [/\bcontemporain(e)?\b/i, /\btendance\b/i, /\burban\b/i],
  },
  {
    id: "minimaliste",
    patterns: [/\bminimal(iste)?\b/i, /\b[eé]pur[eé]\b/i, /\bscand(i|inave)\b/i],
  },
  {
    id: "japandi",
    patterns: [/\bjapandi\b/i, /\bwabi\b/i, /\bzen\b/i, /\bjapon(ais|-)?\b/i],
  },
  {
    id: "chaleureux",
    patterns: [/\bchaleureux\b/i, /\bcosy\b/i, /\bbohem(e|ian)\b/i, /\bvelours?\b/i, /\blaine\b/i],
  },
  {
    id: "elegant",
    patterns: [
      /\b[eé]l[eé]gant(e)?\b/i,
      /\bluxe\b/i,
      /\bchic\b/i,
      /\bhaut\s+de\s+gamme\b/i,
      /\bart\s+d[eé]co\b/i,
    ],
  },
];

export function detectStyles(
  texts: (string | null | undefined)[],
): StyleId[] {
  const blob = texts.filter(Boolean).join(" · ").toLowerCase();
  if (!blob) return [];
  const found = new Set<StyleId>();
  for (const rule of STYLE_RULES) {
    if (rule.patterns.some((r) => r.test(blob))) found.add(rule.id);
  }
  return Array.from(found);
}

export function convertToMad(price: number, currency: string): number {
  // Conversions indicatives — si on scrape un site hors Maroc, on
  // ramène à un ordre de grandeur en MAD pour éviter les 0. L'admin
  // peut corriger à la main ensuite.
  const rates: Record<string, number> = {
    MAD: 1,
    DH: 1,
    DHS: 1,
    DHM: 1,
    EUR: 10.8,
    USD: 10.1,
    GBP: 12.6,
  };
  const rate = rates[currency?.toUpperCase()] ?? 1;
  return Math.round(price * rate);
}
