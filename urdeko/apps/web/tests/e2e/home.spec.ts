import { expect, test } from "@playwright/test";

test.describe("Accueil UrdeKo", () => {
  test("charge la hero + CTA primaire", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Transformez votre pièce");
    await expect(page.getByRole("link", { name: /Commencer mon projet/i })).toBeVisible();
  });

  test("expose le manifest PWA", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.name).toContain("UrdeKo");
    expect(json.icons.length).toBeGreaterThan(0);
  });
});
