import { z } from "zod";
import { ELEMENT_CATEGORIES, STYLES, type ElementCategoryId } from "@/lib/domain";
import { fetchImageBuffer, imageExtensionForMime } from "@/lib/safe-fetch";
import { uploadObject } from "@/lib/storage";
import {
  getAdminProduct,
  normalizeProductList,
  type ManualProductInput,
  type ProductImageInput,
} from "./products";
import type { BackofficeUser } from "./auth";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const categoryIds = ELEMENT_CATEGORIES.map((c) => c.id) as [
  ElementCategoryId,
  ...ElementCategoryId[],
];
const styleIds = new Set<string>(STYLES.map((s) => s.id));

const payloadSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(300),
  brand: z.string().trim().min(1, "Marque requise").max(100),
  category: z.enum(categoryIds),
  priceMad: z.coerce.number().int().positive("Prix requis"),
  sourceUrl: z.preprocess(
    (value) => (value == null ? "" : value),
    z
      .string()
      .trim()
      .transform((value) => (value ? value : null))
      .refine((value) => !value || isValidUrl(value), "URL source invalide"),
  ),
  description: z.preprocess(
    (value) => (value == null ? "" : value),
    z
      .string()
      .trim()
      .max(1000)
      .transform((value) => (value ? value : null)),
  ),
});

export function parseManualProductInput(
  formData: FormData,
  image?: ProductImageInput,
): ManualProductInput {
  const parsed = payloadSchema.parse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    priceMad: formData.get("priceMad"),
    sourceUrl: formData.get("sourceUrl"),
    description: formData.get("description"),
  });

  const styles = formData
    .getAll("styles")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => styleIds.has(value));

  return {
    ...parsed,
    image,
    styles: Array.from(new Set(styles)),
    tags: normalizeProductList(formData.get("tags")?.toString() ?? ""),
  };
}

export async function uploadManualProductImage(
  formData: FormData,
  opts: { duplicateFrom?: string | null; viewer?: BackofficeUser } = {},
): Promise<ProductImageInput | undefined> {
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    return uploadFileImage(file);
  }

  const imageUrl = formData.get("imageUrl");
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    return uploadRemoteImage(imageUrl.trim());
  }

  if (opts.duplicateFrom) {
    const source = await getAdminProduct(opts.duplicateFrom, opts.viewer);
    if (!source) throw new Error("Produit à dupliquer introuvable");
    return { imageUrl: source.imageUrl ?? "", imageKey: source.imageKey };
  }

  return undefined;
}

export async function readManualProductImageForAi(
  formData: FormData,
): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    validateFileImage(file);
    return {
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
    };
  }

  const imageUrl = formData.get("imageUrl");
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    return fetchRemoteImage(imageUrl.trim());
  }

  const existingImageUrl = formData.get("existingImageUrl");
  if (typeof existingImageUrl === "string" && existingImageUrl.trim()) {
    return fetchRemoteImage(existingImageUrl.trim());
  }

  return undefined;
}

async function uploadFileImage(file: File): Promise<ProductImageInput> {
  validateFileImage(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadObject({
    buffer,
    contentType: file.type || "image/jpeg",
    keyPrefix: "catalogue",
  });
  return { imageUrl: uploaded.url, imageKey: uploaded.key };
}

async function uploadRemoteImage(url: string): Promise<ProductImageInput> {
  const image = await fetchRemoteImage(url);
  const uploaded = await uploadObject({
    buffer: image.buffer,
    contentType: image.mimeType,
    keyPrefix: "catalogue",
    extension: imageExtensionForMime(image.mimeType),
  });
  return { imageUrl: uploaded.url, imageKey: uploaded.key };
}

async function fetchRemoteImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  return fetchImageBuffer(url, {
    maxBytes: MAX_IMAGE_BYTES,
    headers: { "user-agent": "UrdeKoAdmin/1.0" },
  });
}

function validateFileImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image supérieure à 20 Mo");
  if (file.type && !isAcceptedImageType(file.type)) {
    throw new Error("Format image non supporté");
  }
}

function isAcceptedImageType(type: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
