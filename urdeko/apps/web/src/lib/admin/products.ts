import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { products as productsTable } from "../db/schema";
import type { ElementCategoryId } from "../domain";

export type AdminProduct = {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  priceMad: number;
  imageUrl: string | null;
  source: "manual" | "scraped" | null;
  sourceUrl: string | null;
  styles: string[];
  tags: string[];
  updatedAt: string;
};

export type AdminProductDetail = AdminProduct & {
  imageKey: string;
  description: string | null;
  createdAt: string;
};

export type ProductImageInput = {
  imageUrl: string;
  imageKey: string;
};

export type ManualProductInput = {
  name: string;
  brand: string;
  category: ElementCategoryId;
  priceMad: number;
  image?: ProductImageInput;
  styles: string[];
  tags: string[];
  sourceUrl: string | null;
  description: string | null;
};

export async function listAdminProducts({
  category,
  search,
  page = 0,
  pageSize = 40,
}: {
  category?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminProduct[]; total: number }> {
  const filters = [] as Array<ReturnType<typeof eq>>;
  if (category) {
    filters.push(eq(productsTable.category, category as never));
  }
  if (search) {
    filters.push(ilike(productsTable.name, `%${search}%`) as never);
  }
  const whereClause = filters.length === 1 ? filters[0] : filters.length > 1 ? and(...filters) : undefined;

  const itemsQuery = db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.updatedAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const totalQuery = db
    .select({ value: count() })
    .from(productsTable);

  const [rows, totalRows] = await Promise.all([
    whereClause ? itemsQuery.where(whereClause) : itemsQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery,
  ]);

  const items: AdminProduct[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    priceMad: r.priceMad,
    imageUrl: r.imageUrl,
    source: r.source,
    sourceUrl: r.sourceUrl,
    styles: r.styles ?? [],
    tags: r.tags ?? [],
    updatedAt: r.updatedAt.toISOString(),
  }));

  return { items, total: totalRows[0]?.value ?? 0 };
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    priceMad: row.priceMad,
    imageUrl: row.imageUrl,
    imageKey: row.imageKey,
    source: row.source,
    sourceUrl: row.sourceUrl,
    styles: row.styles ?? [],
    tags: row.tags ?? [],
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createManualProduct(input: ManualProductInput): Promise<AdminProductDetail> {
  if (!input.image) {
    throw new Error("Image produit requise");
  }

  const id = await generateUniqueProductId(input.brand, input.name);
  await db.insert(productsTable).values({
    id,
    name: input.name,
    brand: input.brand,
    category: input.category as never,
    priceMad: input.priceMad,
    imageUrl: input.image.imageUrl,
    imageKey: input.image.imageKey,
    styles: input.styles,
    tags: input.tags,
    source: "manual",
    sourceUrl: input.sourceUrl,
    description: input.description,
  });

  const product = await getAdminProduct(id);
  if (!product) throw new Error("Produit créé introuvable");
  return product;
}

export async function updateManualProduct(
  id: string,
  input: ManualProductInput,
): Promise<AdminProductDetail> {
  const existing = await getAdminProduct(id);
  if (!existing) throw new Error("Produit introuvable");

  await db
    .update(productsTable)
    .set({
      name: input.name,
      brand: input.brand,
      category: input.category as never,
      priceMad: input.priceMad,
      ...(input.image
        ? {
            imageUrl: input.image.imageUrl,
            imageKey: input.image.imageKey,
          }
        : {}),
      styles: input.styles,
      tags: input.tags,
      sourceUrl: input.sourceUrl,
      description: input.description,
      updatedAt: sql`now()`,
    })
    .where(eq(productsTable.id, id));

  const product = await getAdminProduct(id);
  if (!product) throw new Error("Produit mis à jour introuvable");
  return product;
}

export async function duplicateSourceProduct(id: string): Promise<AdminProductDetail | null> {
  return getAdminProduct(id);
}

export async function deleteProducts(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };
  const deleted = await db
    .delete(productsTable)
    .where(inArray(productsTable.id, ids))
    .returning({ id: productsTable.id });
  return { deleted: deleted.length };
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      category: productsTable.category,
      value: count(),
    })
    .from(productsTable)
    .groupBy(productsTable.category);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = row.category ?? "__unclassified";
    counts[k] = row.value;
  }
  return counts;
}

export function normalizeProductList(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 48)),
    ),
  ).slice(0, 24);
}

async function generateUniqueProductId(brand: string, name: string): Promise<string> {
  const base = slugifyProductId(`${brand}-${name}`) || "produit";
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.id, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function slugifyProductId(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
