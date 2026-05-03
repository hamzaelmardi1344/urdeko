import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://urdeko:urdeko@localhost:55432/urdeko";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "local_dev_auth_secret_change_me_min_32_chars";

const OWNER_EMAIL = "owner@example.com";
const PARTNER_EMAIL = "partner@example.com";
const OTHER_PARTNER_EMAIL = "other-partner@example.com";
const OUTSIDER_EMAIL = "outsider@example.com";

type Role = "customer" | "partner" | "super_admin";

async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

async function ensureBackofficeSchema() {
  await withDb(async (sql) => {
    await sql`
      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM ('customer', 'partner', 'super_admin');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `;
    await sql`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'customer'
    `;
    await sql`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "owner_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "products_owner_user_idx" ON "products" ("owner_user_id")
    `;
  });
}

async function upsertUser(email: string, role: Role): Promise<string> {
  return withDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      INSERT INTO "user" (email, role)
      VALUES (${email}, ${role})
      ON CONFLICT (email)
      DO UPDATE SET role = ${role}
      RETURNING id
    `;
    return rows[0]!.id;
  });
}

async function seedAdminToken(
  email: string,
  token: string,
  expires = new Date(Date.now() + 15 * 60 * 1000),
) {
  const identifier = `admin:${email}`;
  const hash = createHash("sha256").update(`admin:${token}:${AUTH_SECRET}`).digest("hex");
  await withDb(async (sql) => {
    await sql`delete from verification_token where identifier = ${identifier}`;
    await sql`insert into verification_token (identifier, token, expires) values (${identifier}, ${hash}, ${expires})`;
  });
}

async function seedOwnedProduct(ownerUserId: string, id: string) {
  await withDb(async (sql) => {
    await sql`
      INSERT INTO products
        (id, owner_user_id, name, brand, category, price_mad, image_url, image_key, styles, tags, source)
      VALUES
        (${id}, ${ownerUserId}, 'Produit privé', 'Partenaire', 'canape', 1200, 'https://example.com/p.jpg', 'test/p.jpg', '{}', '{}', 'manual')
      ON CONFLICT (id)
      DO UPDATE SET owner_user_id = ${ownerUserId}, updated_at = now()
    `;
  });
}

test.describe("Accès backoffice dédié", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await ensureBackofficeSchema();
  });

  test("/admin non connecté redirige vers /admin/connexion", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/connexion$/);
    await expect(page.getByRole("heading", { name: /Connexion backoffice/i })).toBeVisible();
  });

  test("/connexion?next=/admin bascule vers le login admin dédié", async ({ page }) => {
    await page.goto("/connexion?next=%2Fadmin");
    await expect(page).toHaveURL(/\/admin\/connexion$/);
  });

  test("/connexion?callbackUrl=/admin bascule aussi vers le login admin dédié", async ({
    page,
  }) => {
    await page.goto("/connexion?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin");
    await expect(page).toHaveURL(/\/admin\/connexion$/);
  });

  test("lien admin invalide ou réutilisé retourne au login admin", async ({ page }) => {
    await page.goto(
      `/admin/session?email=${encodeURIComponent(OWNER_EMAIL)}&token=bad-token`,
    );
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
    await expect(page.getByText(/expiré ou déjà utilisé/i)).toBeVisible();
  });

  test("lien admin expiré est refusé", async ({ page }) => {
    const token = `expired-admin-${Date.now()}`;
    await seedAdminToken(OWNER_EMAIL, token, new Date(Date.now() - 60 * 1000));

    await page.goto(
      `/admin/session?email=${encodeURIComponent(OWNER_EMAIL)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
  });

  test("email bootstrap SUPER_ADMIN_EMAILS crée un super admin et consomme le token", async ({
    page,
  }) => {
    const token = `valid-admin-${Date.now()}`;
    const link = `/admin/session?email=${encodeURIComponent(OWNER_EMAIL)}&token=${encodeURIComponent(token)}`;
    await seedAdminToken(OWNER_EMAIL, token);

    await page.goto(link);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

    await page.context().clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
  });

  test("un partenaire non invité ne passe pas", async ({ page }) => {
    const token = `not-invited-${Date.now()}`;
    await seedAdminToken(OUTSIDER_EMAIL, token);

    await page.goto(
      `/admin/session?email=${encodeURIComponent(OUTSIDER_EMAIL)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
  });

  test("un partenaire invité accède au menu mobile limité", async ({ page }) => {
    const token = `valid-partner-${Date.now()}`;
    await page.setViewportSize({ width: 360, height: 800 });
    await upsertUser(PARTNER_EMAIL, "partner");
    await seedAdminToken(PARTNER_EMAIL, token);

    await page.goto(
      `/admin/session?email=${encodeURIComponent(PARTNER_EMAIL)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /Espace partenaire/i })).toBeVisible();

    const menuButton = page.getByRole("button", { name: /ouvrir le menu admin/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const drawer = page.getByLabel("Menu admin mobile");
    await expect(drawer.getByRole("link", { name: /Produits/i }).first()).toBeVisible();
    await expect(drawer.getByText("Configuration")).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: /Utilisateurs/i })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/acces-admin-refuse$/);
  });

  test("un partenaire ne peut pas modifier le produit d'un autre partenaire", async ({
    page,
  }) => {
    const partnerToken = `valid-partner-product-${Date.now()}`;
    const otherOwnerId = await upsertUser(OTHER_PARTNER_EMAIL, "partner");
    await upsertUser(PARTNER_EMAIL, "partner");
    await seedOwnedProduct(otherOwnerId, "private-other-partner-product");
    await seedAdminToken(PARTNER_EMAIL, partnerToken);

    await page.goto(
      `/admin/session?email=${encodeURIComponent(PARTNER_EMAIL)}&token=${encodeURIComponent(partnerToken)}`,
    );
    await page.goto("/admin/produits/private-other-partner-product/modifier");
    await expect(
      page.getByText(/404|introuvable|n'existe pas|This page could not be found/i),
    ).toBeVisible();
  });

  test("aucun email réel partenaire/super admin n'est versionné", async () => {
    const forbidden = [
      ["hamza.elmardi", "gmail.com"],
      ["mounafi", "gmail.com"],
    ].map(([local, domain]) => `${local}@${domain}`);

    const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((file) => !file.includes("pnpm-lock.yaml"));

    const leaks: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const email of forbidden) {
        if (content.includes(email)) leaks.push(`${file}: ${email}`);
      }
    }

    expect(leaks).toEqual([]);
  });
});
