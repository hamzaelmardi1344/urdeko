import { describe, expect, it } from "vitest";
import type { Env } from "../config/env";
import { UploadsService } from "./uploads.service";

type TestEnv = {
  get<K extends keyof Env>(key: K): Env[K];
};

describe("UploadsService", () => {
  it("creates a signed R2 product image upload contract", async () => {
    const env: TestEnv = {
      get: (key) => {
        const values: Partial<Env> = {
          R2_ACCOUNT_ID: "account",
          R2_ACCESS_KEY_ID: "access",
          R2_SECRET_ACCESS_KEY: "secret",
          R2_BUCKET: "media",
          R2_PUBLIC_BASE_URL: "https://media.jibi.ma",
        };
        const value = values[key];
        if (value === undefined) {
          throw new Error(`Missing test env ${String(key)}`);
        }
        return value as Env[typeof key];
      },
    };
    const service = new UploadsService(env);

    const upload = await service.createProductImageUpload("shop_123", {
      fileName: "caftan.jpg",
      contentType: "image/jpeg",
      byteSize: 120_000,
    });

    expect(upload.uploadUrl).toContain("X-Amz-Signature");
    expect(upload.publicUrl).toContain("https://media.jibi.ma/shops/shop_123/products/");
    expect(upload.headers).toEqual({ "content-type": "image/jpeg" });
  });
});
