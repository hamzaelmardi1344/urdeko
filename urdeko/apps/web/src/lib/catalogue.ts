import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { products as productsTable } from "./db/schema";
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

export async function listProducts(filter: ProductFilter): Promise<Product[]> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.category, filter.category))
    .orderBy(productsTable.priceMad);

  const items = rows.map(rowToProduct);

  const { style, budgetMad, flexibility = 20 } = filter;

  return items
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
  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);
  return row ? rowToProduct(row) : null;
}

function rowToProduct(row: typeof productsTable.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: (row.category ?? "decoration") as ElementCategoryId,
    priceMad: row.priceMad,
    imageUrl: row.imageUrl,
    styles: (row.styles ?? []) as StyleId[],
    tags: row.tags ?? [],
    source: row.source,
    sourceUrl: row.sourceUrl ?? undefined,
    description: row.description ?? undefined,
  };
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
