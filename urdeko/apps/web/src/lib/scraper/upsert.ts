import { createClient, type SanityClient } from "@sanity/client";
import { env } from "@/env";
import type { ExtractedProduct } from "./types";

// =====================================================================
// Upsert des produits extraits vers Sanity. Utilise un client dédié
// côté serveur avec le token d'écriture (SANITY_API_TOKEN).
// =====================================================================

let _client: SanityClient | null = null;
function client(): SanityClient {
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

export type UpsertResult = {
  imported: number;
  skipped: number;
  errors: Array<{ externalId: string; message: string }>;
};

export async function upsertProducts(
  products: ExtractedProduct[],
): Promise<UpsertResult> {
  const result: UpsertResult = { imported: 0, skipped: 0, errors: [] };

  for (const product of products) {
    try {
      // Un produit sans catégorie est autorisé mais on le tag "non-classé"
      if (!product.imageUrl || !product.name || !product.priceMad) {
        result.skipped += 1;
        continue;
      }

      const imageBuffer = await fetchImage(product.imageUrl);
      const asset = await client().assets.upload("image", imageBuffer, {
        filename: `${product.externalId}.jpg`,
      });

      const _id = product.externalId.replace(/[^a-zA-Z0-9_-]/g, "_");
      await client().createOrReplace({
        _id,
        _type: "product",
        name: product.name,
        brand: product.brand,
        category: product.category ?? undefined,
        priceMad: product.priceMad,
        mainImage: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        },
        source: "scraped",
        sourceUrl: product.sourceUrl,
        description: product.description,
        style: product.styles,
        tags: product.tags,
      });
      result.imported += 1;
    } catch (err) {
      result.errors.push({
        externalId: product.externalId,
        message: (err as Error).message,
      });
    }
  }

  return result;
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "user-agent": "UrdekoBot/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Image ${url} unreachable (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
