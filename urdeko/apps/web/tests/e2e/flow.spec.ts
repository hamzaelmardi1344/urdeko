import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// =====================================================================
// Test e2e principal. Il valide le flow navigation/formulaires sans
// déclencher Gemini (aucun stub côté app : tout est réel). L'étape
// photo uploade une vraie image mais le test s'arrête avant d'attendre
// le rendu final pour éviter de consommer du quota IA à chaque run.
// =====================================================================

const FIXTURE_PHOTO = path.join(__dirname, "fixtures", "room.jpg");

test.describe.configure({ mode: "serial" });

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
