import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit ne charge pas automatiquement les .env.* (contrairement à Next.js).
// On charge .env.local puis .env avant la validation du schéma.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL manquant. Vérifie apps/web/.env.local ou lance ./setup.sh.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  strict: false,
  verbose: false,
});
