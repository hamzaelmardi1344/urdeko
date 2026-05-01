import { describe, expect, it } from "vitest";
import { normalizeManualProductFormData } from "./product-form";

describe("normalizeManualProductFormData", () => {
  it("normalizes a complete manual product with variants", () => {
    const product = normalizeManualProductFormData(
      formData({
        title: "Caftan moderne",
        titleAr: "قفطان عصري",
        description: "Caftan fluide pour soirées.",
        descriptionAr: "وصف عربي",
        descriptionDarija: "قفطان زوين ومريح.",
        priceMAD: "249.90",
        comparePriceMAD: "299",
        stock: "7",
        unlimited: "on",
        status: "PUBLISHED",
        imageUrl: "https://media.example.com/products/caftan.jpg",
        variantsJson: JSON.stringify([
          { name: "Noir / M", sku: "NOIR-M", priceMAD: 259.5, stock: 3 },
        ]),
      }),
    );

    expect(product).toMatchObject({
      title: "Caftan moderne",
      titleAr: "قفطان عصري",
      description: "Caftan fluide pour soirées.",
      descriptionAr: "وصف عربي",
      descriptionDarija: "قفطان زوين ومريح.",
      priceMAD: 24990,
      comparePriceMAD: 29900,
      stock: 7,
      unlimited: true,
      status: "PUBLISHED",
      images: [{ url: "https://media.example.com/products/caftan.jpg", position: 0 }],
      variants: [{ name: "Noir / M", sku: "NOIR-M", priceMAD: 25950, stock: 3 }],
      aiGenerated: false,
    });
  });

  it("converts decimal MAD inputs into cents", () => {
    const product = normalizeManualProductFormData(
      formData({
        title: "Sac cuir",
        description: "Sac pratique.",
        priceMAD: "10,50",
        stock: "2",
        status: "DRAFT",
        imageUrl: "https://media.example.com/products/sac.webp",
      }),
    );

    expect(product.priceMAD).toBe(1050);
    expect(product.comparePriceMAD).toBeUndefined();
  });

  it("strips empty optional fields", () => {
    const product = normalizeManualProductFormData(
      formData({
        title: "Bijou",
        titleAr: "   ",
        description: "Bijou artisanal.",
        descriptionAr: "",
        descriptionDarija: "",
        comparePriceMAD: "",
        priceMAD: "120",
        stock: "1",
        status: "DRAFT",
        imageUrl: "https://media.example.com/products/bijou.png",
      }),
    );

    expect(product.titleAr).toBeUndefined();
    expect(product.descriptionAr).toBeUndefined();
    expect(product.descriptionDarija).toBeUndefined();
    expect(product.comparePriceMAD).toBeUndefined();
  });

  it("rejects invalid image URLs", () => {
    expect(() =>
      normalizeManualProductFormData(
        formData({
          title: "Produit",
          description: "Description",
          priceMAD: "50",
          stock: "1",
          status: "DRAFT",
          imageUrl: "not-a-url",
        }),
      ),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      normalizeManualProductFormData(
        formData({
          title: "",
          description: "Description",
          priceMAD: "",
          stock: "1",
          status: "DRAFT",
          imageUrl: "https://media.example.com/products/missing.jpg",
        }),
      ),
    ).toThrow("Le prix est obligatoire.");
  });
});

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}
