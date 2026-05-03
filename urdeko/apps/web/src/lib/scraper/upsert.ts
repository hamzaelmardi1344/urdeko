import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { products as productsTable } from "../db/schema";
import { fetchImageBuffer, imageExtensionForMime } from "../safe-fetch";
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
  opts: { ownerUserId?: string | null } = {},
): Promise<UpsertResult> {
  const result: UpsertResult = { imported: 0, skipped: 0, errors: [] };

  for (const product of products) {
    try {
      if (!product.imageUrl || !product.name || !product.priceMad) {
        result.skipped += 1;
        continue;
      }

      const id = productIdForOwner(product.externalId, opts.ownerUserId ?? null);

      const image = await fetchImageBuffer(product.imageUrl, {
        maxBytes: 20 * 1024 * 1024,
        headers: { "user-agent": "UrdekoBot/1.0" },
      });
      const uploaded = await uploadObject({
        buffer: image.buffer,
        contentType: image.mimeType,
        keyPrefix: "catalogue",
        extension: imageExtensionForMime(image.mimeType),
      });

      await db
        .insert(productsTable)
        .values({
          id,
          ownerUserId: opts.ownerUserId ?? null,
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
            ownerUserId: opts.ownerUserId ?? null,
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

function productIdForOwner(externalId: string, ownerUserId: string | null): string {
  const safeExternalId = externalId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  if (!ownerUserId) return safeExternalId || `scraped_${Date.now()}`;
  const ownerPrefix = ownerUserId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `partner_${ownerPrefix}_${safeExternalId || "scraped"}`;
}
