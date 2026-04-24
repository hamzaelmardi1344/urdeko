import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { products as productsTable } from "../db/schema";
import { uploadObject } from "../storage";
import type { ExtractedProduct } from "./types";

// =====================================================================
// Upsert des produits extraits vers Postgres + S3.
// L'image est téléchargée depuis la source puis re-uploadée sur notre
// bucket pour ne pas dépendre des CDN tiers (et garder le contrôle des
// quotas/transformations).
// =====================================================================

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
      if (!product.imageUrl || !product.name || !product.priceMad) {
        result.skipped += 1;
        continue;
      }

      const id = product.externalId.replace(/[^a-zA-Z0-9_-]/g, "_");

      const imageBuffer = await fetchImage(product.imageUrl);
      const uploaded = await uploadObject({
        buffer: imageBuffer,
        contentType: "image/jpeg",
        keyPrefix: "catalogue",
        extension: ".jpg",
      });

      await db
        .insert(productsTable)
        .values({
          id,
          name: product.name,
          brand: product.brand,
          category: product.category as never,
          priceMad: product.priceMad,
          imageUrl: uploaded.url,
          imageKey: uploaded.key,
          styles: product.styles,
          tags: product.tags,
          source: "scraped",
          sourceUrl: product.sourceUrl,
          description: product.description,
        })
        .onConflictDoUpdate({
          target: productsTable.id,
          set: {
            name: product.name,
            brand: product.brand,
            category: product.category as never,
            priceMad: product.priceMad,
            imageUrl: uploaded.url,
            imageKey: uploaded.key,
            styles: product.styles,
            tags: product.tags,
            source: "scraped",
            sourceUrl: product.sourceUrl,
            description: product.description,
            updatedAt: sql`now()`,
          },
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
