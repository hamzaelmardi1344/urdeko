import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId) {
  throw new Error(
    "SANITY_STUDIO_PROJECT_ID est requis. Crée un projet sur https://sanity.io puis renseigne-le dans .env.",
  );
}

export default defineConfig({
  name: "urdeko",
  title: "UrdeKo — Catalogue",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
