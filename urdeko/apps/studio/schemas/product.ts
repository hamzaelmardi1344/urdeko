import { defineField, defineType } from "sanity";

export const productSchema = defineType({
  name: "product",
  title: "Produit",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nom",
      type: "string",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "brand",
      title: "Marque",
      type: "string",
      options: {
        list: ["UrdeKo", "Kitea", "Mobilia", "IKEA Maroc", "Autre"],
      },
    }),
    defineField({
      name: "category",
      title: "Catégorie",
      type: "string",
      options: {
        list: [
          { title: "Canapé", value: "canape" },
          { title: "Table basse", value: "table_basse" },
          { title: "Tapis", value: "tapis" },
          { title: "Luminaire", value: "luminaire" },
          { title: "Décoration", value: "decoration" },
          { title: "Meuble TV", value: "meuble_tv" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "priceMad",
      title: "Prix (MAD)",
      type: "number",
      validation: (rule) => rule.required().positive().integer(),
    }),
    defineField({
      name: "mainImage",
      title: "Image principale",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "gallery",
      title: "Galerie",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "style",
      title: "Styles compatibles",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: ["moderne", "contemporain", "minimaliste", "japandi", "chaleureux", "elegant"],
      },
    }),
    defineField({
      name: "tags",
      title: "Mots-clés",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      options: {
        list: [
          { title: "Saisie manuelle", value: "manual" },
          { title: "Scraping automatique", value: "scraped" },
        ],
        layout: "radio",
      },
      initialValue: "manual",
    }),
    defineField({
      name: "sourceUrl",
      title: "URL marchand",
      type: "url",
      description: "Page marchand d'origine (si scrapé).",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "priceMad",
      brand: "brand",
      media: "mainImage",
    },
    prepare({ title, subtitle, brand, media }) {
      return {
        title,
        subtitle: `${brand ?? "—"} · ${subtitle ?? 0} MAD`,
        media,
      };
    },
  },
});
