import { createClient, type SanityClient } from "@sanity/client";
import { env } from "@/env";

// Client Sanity avec token d'écriture — réservé au backoffice serveur.
let _client: SanityClient | null = null;
function admin(): SanityClient {
  if (!_client) {
    _client = createClient({
      projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: env.NEXT_PUBLIC_SANITY_DATASET,
      apiVersion: "2024-10-15",
      token: env.SANITY_API_TOKEN,
      useCdn: false,
    });
  }
  return _client;
}

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
  const conds: string[] = [];
  if (category) conds.push(`category == $category`);
  if (search) conds.push(`name match $search`);
  const where = conds.length ? `&& ${conds.join(" && ")}` : "";

  const listQuery = /* groq */ `*[_type == "product" ${where}] | order(_updatedAt desc) [$offset...$end] {
    "id": _id,
    name,
    brand,
    category,
    priceMad,
    "imageUrl": mainImage.asset->url,
    source,
    sourceUrl,
    "styles": coalesce(style, []),
    "tags": coalesce(tags, []),
    "updatedAt": _updatedAt
  }`;
  const countQuery = `count(*[_type == "product" ${where}])`;
  const params = {
    category: category ?? undefined,
    search: search ? `${search}*` : undefined,
    offset: page * pageSize,
    end: page * pageSize + pageSize,
  };

  const [items, total] = await Promise.all([
    admin().fetch<AdminProduct[]>(listQuery, params),
    admin().fetch<number>(countQuery, params),
  ]);
  return { items, total: total ?? 0 };
}

export async function deleteProducts(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };
  const tx = admin().transaction();
  for (const id of ids) tx.delete(id);
  await tx.commit({ visibility: "async" });
  return { deleted: ids.length };
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const rows = await admin().fetch<Array<{ category: string | null }>>(
    `*[_type == "product"]{ category }`,
  );
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const k = r.category ?? "__unclassified";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
