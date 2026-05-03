import { sql } from "drizzle-orm";
import { db } from "./client";

declare global {
  // eslint-disable-next-line no-var
  var __urdekoBackofficeSchemaReady: Promise<void> | undefined;
}

export function ensureBackofficeSchema(): Promise<void> {
  globalThis.__urdekoBackofficeSchemaReady ??= applyBackofficeSchema();
  return globalThis.__urdekoBackofficeSchemaReady;
}

async function applyBackofficeSchema(): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "user_role" AS ENUM ('customer', 'partner', 'super_admin');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `);

  await db.execute(sql`
    ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'customer'
  `);

  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "owner_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_owner_user_idx" ON "products" ("owner_user_id")
  `);
}
