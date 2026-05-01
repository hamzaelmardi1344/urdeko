import { z } from "zod";
import { createProductInputSchema, type CreateProductInput } from "@bep/shared-types";

const productStatusInputSchema = z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT");
const variantsJsonSchema = z.array(
  z.object({
    name: z.string(),
    sku: z.string().optional().nullable(),
    priceMAD: z.union([z.string(), z.number()]).optional().nullable(),
    stock: z.union([z.string(), z.number()]).optional(),
  }),
);

type FormSource = FormData | Record<string, unknown>;

export function normalizeManualProductFormData(input: FormSource): CreateProductInput {
  const payload = {
    title: readText(input, "title"),
    titleAr: readOptionalText(input, "titleAr"),
    description: readText(input, "description"),
    descriptionAr: readOptionalText(input, "descriptionAr"),
    descriptionDarija: readOptionalText(input, "descriptionDarija"),
    priceMAD: parseRequiredMAD(input, "priceMAD"),
    comparePriceMAD: parseOptionalMAD(input, "comparePriceMAD"),
    stock: parseNonNegativeInt(readText(input, "stock") || "0", "Stock"),
    unlimited: readBoolean(input, "unlimited"),
    status: productStatusInputSchema.parse(readText(input, "status") || "DRAFT"),
    images: [{ url: readText(input, "imageUrl"), position: 0 }],
    variants: parseVariants(readOptionalText(input, "variantsJson")),
    aiGenerated: false,
  };

  return createProductInputSchema.parse(stripUndefined(payload));
}

function parseVariants(rawValue: string | undefined): CreateProductInput["variants"] {
  if (!rawValue) {
    return [];
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawValue);
  } catch {
    throw new Error("Les variantes doivent être un tableau JSON valide.");
  }

  const variants = variantsJsonSchema.parse(parsedJson);
  return variants.map((variant) =>
    stripUndefined({
      name: variant.name.trim(),
      sku: optionalString(variant.sku),
      priceMAD:
        variant.priceMAD === undefined || variant.priceMAD === null || String(variant.priceMAD).trim() === ""
          ? undefined
          : parseMADToCents(variant.priceMAD, "Prix variante"),
      stock:
        variant.stock === undefined || String(variant.stock).trim() === ""
          ? 0
          : parseNonNegativeInt(String(variant.stock), "Stock variante"),
    }),
  );
}

function parseRequiredMAD(input: FormSource, key: string): number {
  const value = readText(input, key);
  if (!value) {
    throw new Error("Le prix est obligatoire.");
  }
  return parseMADToCents(value, "Prix");
}

function parseOptionalMAD(input: FormSource, key: string): number | undefined {
  const value = readOptionalText(input, key);
  return value ? parseMADToCents(value, "Prix barré") : undefined;
}

function parseMADToCents(value: string | number, label: string): number {
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} doit être un montant MAD positif.`);
  }
  return Math.round(amount * 100);
}

function parseNonNegativeInt(value: string, label: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} doit être un entier positif.`);
  }
  return Number(normalized);
}

function readText(input: FormSource, key: string): string {
  const value = readValue(input, key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(input: FormSource, key: string): string | undefined {
  return optionalString(readValue(input, key));
}

function readBoolean(input: FormSource, key: string): boolean {
  const value = readValue(input, key);
  return value === "on" || value === "true" || value === true;
}

function readValue(input: FormSource, key: string): unknown {
  if (input instanceof FormData) {
    return input.get(key);
  }
  return input[key];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined)) as T;
}
