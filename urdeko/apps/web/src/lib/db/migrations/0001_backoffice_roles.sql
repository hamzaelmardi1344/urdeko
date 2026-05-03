DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('customer', 'partner', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'customer';

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "owner_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "products_owner_user_idx" ON "products" ("owner_user_id");
