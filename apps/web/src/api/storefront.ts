import { storefrontSchema, type Storefront } from "@bep/shared-types";

const apiUrl = process.env.PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getStorefront(slug: string): Promise<Storefront> {
  const response = await fetch(`${apiUrl}/storefront/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error(`Storefront request failed with ${response.status}`);
  }
  const payload: unknown = await response.json();
  return storefrontSchema.parse(payload);
}
