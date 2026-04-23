import { createClient } from "@sanity/client";
import type { NormalizedProduct } from "./types";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId) {
  throw new Error(
    "SANITY_PROJECT_ID (ou NEXT_PUBLIC_SANITY_PROJECT_ID) est requis pour upsert le catalogue.",
  );
}
if (!token) {
  throw new Error(
    "SANITY_API_TOKEN est requis (token d'écriture — crée-le sur https://sanity.io/manage).",
  );
}

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2024-10-15",
  token,
  useCdn: false,
});

export async function upsertProduct(product: NormalizedProduct): Promise<void> {
  const imageBuffer = await fetchImage(product.imageUrl);
  const asset = await sanity.assets.upload("image", imageBuffer, {
    filename: `${product.externalId}.jpg`,
  });
  const _id = product.externalId.replace(/[^a-zA-Z0-9_-]/g, "_");
  await sanity.createOrReplace({
    _id,
    _type: "product",
    name: product.name,
    brand: product.brand,
    category: product.category,
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
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "user-agent": "UrdekoBot/1.0" } });
  if (!res.ok) throw new Error(`Image ${url} unreachable (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
