import { sanity, urlForImage } from "./sanity/client";
import type { ElementCategoryId, StyleId } from "./domain";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: ElementCategoryId;
  priceMad: number;
  imageUrl: string;
  styles: StyleId[];
  tags: string[];
  source: "manual" | "scraped";
  sourceUrl?: string;
  description?: string;
};

export type ProductFilter = {
  category: ElementCategoryId;
  style?: StyleId | null;
  budgetMad?: number | null;
  flexibility?: number; // 0..100
};

type RawProduct = Omit<Product, "imageUrl"> & { mainImage?: unknown };

const LIST_QUERY = /* groq */ `
  *[_type == "product" && category == $category] | order(priceMad asc) {
    "id": _id,
    name,
    brand,
    category,
    priceMad,
    mainImage,
    "styles": coalesce(style, []),
    "tags": coalesce(tags, []),
    source,
    sourceUrl,
    description
  }
`;

const ONE_QUERY = /* groq */ `
  *[_type == "product" && _id == $id][0]{
    "id": _id,
    name,
    brand,
    category,
    priceMad,
    mainImage,
    "styles": coalesce(style, []),
    "tags": coalesce(tags, []),
    source,
    sourceUrl,
    description
  }
`;

export async function listProducts(filter: ProductFilter): Promise<Product[]> {
  const raw = await sanity.fetch<RawProduct[]>(
    LIST_QUERY,
    { category: filter.category },
    { next: { tags: ["products", `products:${filter.category}`], revalidate: 3600 } },
  );

  const products = raw
    .map(normalize)
    .filter((p): p is Product => p !== null);

  const { style, budgetMad, flexibility = 20 } = filter;

  return products
    .filter((product) =>
      style ? product.styles.includes(style) || product.styles.length === 0 : true,
    )
    .map((product) => ({
      product,
      score: scoreProduct(product, { style, budgetMad, flexibility }),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export async function getProduct(id: string): Promise<Product | null> {
  const raw = await sanity.fetch<RawProduct | null>(ONE_QUERY, { id });
  return raw ? normalize(raw) : null;
}

function normalize(raw: RawProduct): Product | null {
  const imageUrl = urlForImage(raw.mainImage);
  if (!imageUrl) return null;
  const { mainImage: _mainImage, ...rest } = raw;
  return { ...rest, imageUrl };
}

function scoreProduct(
  product: Product,
  {
    style,
    budgetMad,
    flexibility,
  }: Pick<ProductFilter, "style" | "budgetMad" | "flexibility">,
): number {
  let score = 0;
  if (style && product.styles.includes(style)) score += 10;
  if (budgetMad) {
    const tolerance = budgetMad * ((flexibility ?? 20) / 100);
    const allowed = budgetMad + tolerance;
    if (product.priceMad <= budgetMad) score += 6;
    else if (product.priceMad <= allowed) score += 3;
    else score -= 4;
  }
  if (product.source === "manual") score += 1;
  return score;
}
