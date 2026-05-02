import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://urdeko:urdeko@localhost:55432/urdeko";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "local_dev_auth_secret_change_me_min_32_chars";

async function seedAdminToken(
  email: string,
  token: string,
  expires = new Date(Date.now() + 15 * 60 * 1000),
) {
  const identifier = `admin:${email}`;
  const hash = createHash("sha256").update(`admin:${token}:${AUTH_SECRET}`).digest("hex");
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
  await sql`delete from verification_token where identifier = ${identifier}`;
  await sql`insert into verification_token (identifier, token, expires) values (${identifier}, ${hash}, ${expires})`;
  await sql.end();
}

test.describe("Accès admin dédié", () => {
  test.describe.configure({ mode: "serial" });

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
    await page.goto("/admin/session?email=hamza.elmardi%40gmail.com&token=bad-token");
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
    await expect(page.getByText(/expiré ou déjà utilisé/i)).toBeVisible();
  });

  test("lien admin expiré est refusé", async ({ page }) => {
    const email = "hamza.elmardi@gmail.com";
    const token = `expired-admin-${Date.now()}`;
    await seedAdminToken(email, token, new Date(Date.now() - 60 * 1000));

    await page.goto(
      `/admin/session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
  });

  test("lien admin valide crée une session et consomme le token", async ({ page }) => {
    const email = "hamza.elmardi@gmail.com";
    const token = `valid-admin-${Date.now()}`;
    const link = `/admin/session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await seedAdminToken(email, token);

    await page.goto(link);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page).toHaveTitle(/Tableau de bord/);

    await page.context().clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/admin\/connexion\?error=invalid$/);
  });

  test("mounafi@gmail.com est autorisé comme admin", async ({ page }) => {
    const email = "mounafi@gmail.com";
    const token = `valid-mounafi-${Date.now()}`;
    await seedAdminToken(email, token);

    await page.goto(
      `/admin/session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page).toHaveTitle(/Tableau de bord/);
  });

  test("le menu backoffice est visible et ouvrable sur mobile", async ({ page }) => {
    const email = "mounafi@gmail.com";
    const token = `valid-mobile-menu-${Date.now()}`;
    await page.setViewportSize({ width: 360, height: 800 });
    await seedAdminToken(email, token);

    await page.goto(
      `/admin/session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
    );
    await expect(page).toHaveURL(/\/admin$/);

    const menuButton = page.getByRole("button", { name: /ouvrir le menu admin/i });
    await expect(menuButton).toBeVisible();
    await expect(page.getByRole("navigation").first()).toBeVisible();

    await menuButton.click();
    const drawer = page.getByLabel("Menu admin mobile");
    await expect(drawer.getByText("Configuration")).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Produits/i }).first()).toBeVisible();
  });

  test("email non allowlist ne crée pas de session admin", async ({ page }) => {
    await page.goto("/admin/connexion");
    await page.getByLabel(/Email administrateur/i).fill("personne@example.com");
    await page.getByRole("button", { name: /Recevoir le lien admin/i }).click();

    await expect(page.getByRole("heading", { name: /Lien admin envoyé/i })).toBeVisible();
    await expect(page.getByText("personne@example.com")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/connexion$/);
  });
});
