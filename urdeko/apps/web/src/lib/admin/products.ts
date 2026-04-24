import { and, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { products as productsTable } from "../db/schema";

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
