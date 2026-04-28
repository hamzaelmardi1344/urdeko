import { describe, expect, it } from "vitest";
import {
  connectInstagramInputSchema,
  integrationStatusResponseSchema,
  instagramImportResultSchema,
  previewHealthSchema,
  whatsappTestTemplateInputSchema,
} from "./integrations";

describe("integration contracts", () => {
  it("requires OAuth state when Instagram connects with an auth code", () => {
    expect(() =>
      connectInstagramInputSchema.parse({
        code: "ig-code",
        redirectUri: "https://api.jibi.ma/instagram/callback",
      }),
    ).toThrow();
    expect(
      connectInstagramInputSchema.parse({
        code: "ig-code",
        redirectUri: "https://api.jibi.ma/instagram/callback",
        state: "signed-state",
      }),
    ).toEqual({
      code: "ig-code",
      redirectUri: "https://api.jibi.ma/instagram/callback",
      state: "signed-state",
    });
  });

  it("tracks skipped Instagram imports and provider diagnostics", () => {
    expect(
      instagramImportResultSchema.parse({ imported: 2, skipped: 1, products: [] }),
    ).toMatchObject({ imported: 2, skipped: 1 });
    expect(
      integrationStatusResponseSchema.parse({
        providers: [
          {
            provider: "R2",
            configured: false,
            connected: false,
            mode: "missing",
            missingEnv: ["R2_ACCOUNT_ID"],
            action: "Configure R2",
            lastCheckedAt: new Date().toISOString(),
          },
        ],
      }).providers[0]?.missingEnv,
    ).toEqual(["R2_ACCOUNT_ID"]);
  });

  it("validates WhatsApp template test payloads", () => {
    expect(
      whatsappTestTemplateInputSchema.parse({
        toE164: "+212612345678",
        type: "ORDER_CONFIRMATION",
      }),
    ).toEqual({
      toE164: "+212612345678",
      type: "ORDER_CONFIRMATION",
      language: "fr",
    });
  });

  it("validates public preview health diagnostics", () => {
    expect(
      previewHealthSchema.parse({
        ok: true,
        environment: "production",
        apiUrl: "https://api.preview.jibi.ma",
        dbReachable: true,
        redisReachable: true,
        checkedAt: new Date().toISOString(),
      }),
    ).toMatchObject({
      ok: true,
      dbReachable: true,
      redisReachable: true,
    });
  });
});
