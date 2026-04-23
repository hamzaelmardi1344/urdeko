// Reference data pour toute l'app (cohérent avec le design des maquettes).

export const ROOM_TYPES = [
  { id: "salon", label: "Salon", icon: "weekend" },
  { id: "chambre", label: "Chambre", icon: "bed" },
  { id: "salle_a_manger", label: "Salle à manger", icon: "restaurant" },
  { id: "bureau", label: "Bureau", icon: "desk" },
  { id: "espace_jardin", label: "Espace jardin", icon: "yard" },
] as const;

// Photos d'inspiration Unsplash — URLs directes images.unsplash.com, stables
// tant que la photo existe côté Unsplash. On applique les paramètres CDN
// (w=800, q=80, fit=crop) dans l'URL, pas besoin de <Image/> Next.js.
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

export const STYLES = [
  {
    id: "moderne",
    label: "Moderne",
    description: "Lignes pures, matériaux mixtes, accents chaleureux.",
    image: UNSPLASH("1618219908412-a29a1bb7b86e"),
  },
  {
    id: "contemporain",
    label: "Contemporain",
    description: "Textures feutrées et couleurs équilibrées.",
    image: UNSPLASH("1586023492125-27b2c045efd7"),
  },
  {
    id: "minimaliste",
    label: "Minimaliste",
    description: "Essentiel, tonal, avec beaucoup de respiration.",
    image: UNSPLASH("1618220179428-22790b461013"),
  },
  {
    id: "japandi",
    label: "Japandi",
    description: "Bois clair, sobriété scandinave et sérénité japonaise.",
    image: UNSPLASH("1617104551722-3b2d51366400"),
  },
  {
    id: "chaleureux",
    label: "Chaleureux",
    description: "Velours, laine, lumières tamisées, accueillant.",
    image: UNSPLASH("1616486338812-3dadae4b4ace"),
  },
  {
    id: "elegant",
    label: "Élégant",
    description: "Matières nobles, finitions dorées, raffinement.",
    image: UNSPLASH("1600585154340-be6161a56a0c"),
  },
] as const;

export const ELEMENT_CATEGORIES = [
  { id: "canape", label: "Canapé", icon: "weekend" },
  { id: "table_basse", label: "Table basse", icon: "table_bar" },
  { id: "tapis", label: "Tapis", icon: "stairs_2" },
  { id: "luminaire", label: "Luminaire", icon: "light" },
  { id: "decoration", label: "Décoration", icon: "auto_awesome" },
  { id: "meuble_tv", label: "Meuble TV", icon: "tv" },
] as const;

export const PALETTES = [
  {
    id: "harmonie_urdeko",
    label: "Harmonie UrdeKo",
    description: "Sélection maison — terracotta, crème et vert olive.",
    colors: ["#a63300", "#f8f6f2", "#6b7a56", "#2e2f2d"],
    recommended: true,
  },
  {
    id: "nuances_terre",
    label: "Nuances de Terre",
    description: "Ocre, argile et sable. Chaleureux et naturel.",
    colors: ["#b7754a", "#d9b27b", "#e9d4ba", "#6b4226"],
  },
  {
    id: "brise_marine",
    label: "Brise Marine",
    description: "Bleu profond, lin blanc, bois flotté.",
    colors: ["#2b4a5e", "#8ca7b8", "#f2efe8", "#c9a97a"],
  },
  {
    id: "forêt_ombragee",
    label: "Forêt Ombragée",
    description: "Vert sapin, mousse, cuir tanné.",
    colors: ["#2f4636", "#78906c", "#e4dbc8", "#5d3a1e"],
  },
  {
    id: "jardin_secret",
    label: "Jardin Secret",
    description: "Rose poudré, vert d'eau, laiton brossé.",
    colors: ["#cf8d8b", "#a3bfb1", "#f7ede2", "#b38e52"],
  },
] as const;

export const BUDGET_PRESETS = [5000, 10000, 15000, 25000, 40000] as const;

export type RoomTypeId = (typeof ROOM_TYPES)[number]["id"];
export type StyleId = (typeof STYLES)[number]["id"];
export type ElementCategoryId = (typeof ELEMENT_CATEGORIES)[number]["id"];
export type PaletteId = (typeof PALETTES)[number]["id"];

export function getStyle(id: StyleId | string | null | undefined) {
  return STYLES.find((style) => style.id === id) ?? null;
}

export function getRoomType(id: RoomTypeId | string | null | undefined) {
  return ROOM_TYPES.find((room) => room.id === id) ?? null;
}

export function getPalette(id: PaletteId | string | null | undefined) {
  return PALETTES.find((palette) => palette.id === id) ?? null;
}

export function getCategory(id: ElementCategoryId | string | null | undefined) {
  return ELEMENT_CATEGORIES.find((category) => category.id === id) ?? null;
}

export const DEFAULT_BUDGET_MAD = 15000;
export const DEFAULT_FLEXIBILITY = 10;
