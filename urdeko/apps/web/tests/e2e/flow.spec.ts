import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

// =====================================================================
// Test e2e principal. Il valide le flow navigation/formulaires sans
// déclencher Gemini (aucun stub côté app : tout est réel). L'étape
// photo uploade une vraie image mais le test s'arrête avant d'attendre
// le rendu final pour éviter de consommer du quota IA à chaque run.
// =====================================================================

const FIXTURE_PHOTO = path.join(__dirname, "fixtures", "room.jpg");

loadEnv({ path: ".env.local" });

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://urdeko:urdeko@localhost:55432/urdeko";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "local_dev_auth_secret_change_me_min_32_chars";

test.describe.configure({ mode: "serial" });

async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

async function seedClientMagicToken(
  email: string,
  token: string,
  expires = new Date(Date.now() + 15 * 60 * 1000),
) {
  const hash = createHash("sha256").update(`${token}${AUTH_SECRET}`).digest("hex");
  await withDb(async (sql) => {
    await sql`delete from verification_token where identifier = ${email}`;
    await sql`insert into verification_token (identifier, token, expires) values (${email}, ${hash}, ${expires})`;
  });
}

async function projectOwner(projectId: string) {
  return withDb(async (sql) => {
    const rows = await sql<{ user_id: string | null; guest_id: string | null; email: string | null }[]>`
      select p.user_id, p.guest_id, u.email
      from projects p
      left join "user" u on u.id = p.user_id
      where p.id = ${projectId}
      limit 1
    `;
    return rows[0] ?? null;
  });
}

async function createGuestProject(page: import("@playwright/test").Page, name: string) {
  await page.goto("/projets/nouveau");
  await page.getByLabel(/Nom du projet/i).fill(name);
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page).toHaveURL(/\/projets\/.+\/espace$/, { timeout: 15_000 });
  const projectId = page.url().match(/\/projets\/([^/]+)\//)?.[1];
  expect(projectId).toBeTruthy();
  return projectId!;
}

test("flow création projet → choix espace → guide photo", async ({ page }) => {
  await page.goto("/projets/nouveau");
  await page.getByLabel(/Nom du projet/i).fill("Test projet e2e");
  await page.getByRole("button", { name: /Continuer/ }).click();

  await expect(page).toHaveURL(/\/projets\/.+\/espace$/, { timeout: 15_000 });
  await page.locator('input[name="roomType"][value="salon"]').check({ force: true });
  await page.getByRole("button", { name: /Continuer/ }).click();

  await expect(page).toHaveURL(/\/photo\/guide$/);
  await expect(
    page.getByRole("heading", { name: /Quelques conseils avant de prendre la photo/i }),
  ).toBeVisible();
});

test("préparation photo sans photo → retour guide", async ({ page }) => {
  await page.goto("/projets/nouveau");
  await page.getByLabel(/Nom du projet/i).fill("Projet sans photo");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page).toHaveURL(/\/projets\/.+\/espace$/, { timeout: 15_000 });
  await page.locator('input[name="roomType"][value="salon"]').check({ force: true });
  await page.getByRole("button", { name: /Continuer/ }).click();

  await expect(page).toHaveURL(/\/photo\/guide$/);
  await page.goto(page.url().replace("/photo/guide", "/photo/preparation"));
  await expect(page).toHaveURL(/\/photo\/guide$/);
});

test("rendu inaccessible sans session ni cookie invité propriétaire", async ({
  baseURL,
  browser,
  page,
}) => {
  const projectId = await createGuestProject(page, `Projet privé ${Date.now()}`);

  const otherContext = await browser.newContext();
  await otherContext.clearCookies();
  expect((await otherContext.cookies()).map((cookie) => cookie.name)).not.toContain(
    "urdeko_guest",
  );
  const otherPage = await otherContext.newPage();
  const response = await otherPage.goto(
    new URL(`/projets/${projectId}/rendu`, baseURL ?? "http://localhost:3000").toString(),
  );
  expect(response?.status()).toBeLessThan(500);
  await expect(
    otherPage.getByText(/Cette page n'existe pas|This page could not be found|404/i),
  ).toBeVisible();
  await otherContext.close();
});

test("coordonnées → compte obligatoire → magic link rattache le projet", async ({
  page,
}) => {
  const email = `client-${Date.now()}@example.com`;
  const projectName = `Projet compte ${Date.now()}`;
  const projectId = await createGuestProject(page, projectName);

  await page.goto(`/projets/${projectId}/coordonnees`);
  await page.locator('input[name="fullName"]').fill("Client Test");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="city"]').fill("Casablanca");
  await page.getByRole("button", { name: /Générer mon rendu/i }).click();

  await expect(page).toHaveURL(new RegExp(`/projets/${projectId}/compte$`));
  await expect(page.getByText(email)).toBeVisible();

  const rawToken = `client-token-${Date.now()}`;
  await seedClientMagicToken(email, rawToken);
  const callbackUrl = `/connexion/rattacher?projectId=${projectId}&next=${encodeURIComponent(
    `/projets/${projectId}/generation`,
  )}`;

  await page.goto(
    `/api/auth/callback/nodemailer?callbackUrl=${encodeURIComponent(
      callbackUrl,
    )}&token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`,
  );

  await expect(page).toHaveURL(new RegExp(`/projets/${projectId}/generation$`), {
    timeout: 15_000,
  });

  const owner = await projectOwner(projectId);
  expect(owner?.email).toBe(email);
  expect(owner?.guest_id).toBeNull();

  await page.goto("/projets");
  await expect(page.getByText(projectName)).toBeVisible();

  await page.goto("/profil");
  await expect(page.getByText(email)).toBeVisible();
});

// Ce test exerce le vrai flux upload → enqueueJob → analyse Gemini.
// Il est marqué skip par défaut pour ne pas consommer de quota IA à chaque
// CI run ; active-le via `RUN_AI_E2E=1 pnpm test` localement.
const shouldRunAi = process.env.RUN_AI_E2E === "1";

test("upload photo → analyse Gemini → étape préparation", async ({ page }) => {
  test.skip(
    !shouldRunAi || !fs.existsSync(FIXTURE_PHOTO),
    "AI e2e désactivé (RUN_AI_E2E != 1 ou fixture manquante)",
  );

  await page.goto("/projets/nouveau");
  await page.getByLabel(/Nom du projet/i).fill("E2E IA");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.locator('input[name="roomType"][value="salon"]').check({ force: true });
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByRole("link", { name: /Prendre|Charger|Importer/i }).click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(FIXTURE_PHOTO);
  await page.getByRole("button", { name: /Valider|Analyser|Envoyer/i }).click();

  await expect(page).toHaveURL(/\/photo\/preparation$/, { timeout: 20_000 });
  await expect(page.getByText(/analyse|préparation/i).first()).toBeVisible();
});
