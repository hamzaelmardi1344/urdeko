import { describe, expect, it } from "vitest";
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  it("encrypts and decrypts provider secrets with AES-256-GCM", () => {
    const env = {
      get: () => Buffer.alloc(32, 7).toString("base64"),
    };
    const service = new EncryptionService(env);
    const encrypted = service.encrypt("provider-secret");
    expect(encrypted).not.toContain("provider-secret");
    expect(service.decrypt(encrypted)).toBe("provider-secret");
  });
});
