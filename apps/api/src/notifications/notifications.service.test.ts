import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../config/env";
import { NotificationsService } from "./notifications.service";

type TestEnv = {
  get<K extends keyof Env>(key: K): Env[K];
};

describe("NotificationsService", () => {
  it("verifies WhatsApp webhook signatures against the raw request body", () => {
    const appSecret = "whatsapp-app-secret";
    const env: TestEnv = {
      get: (key) => {
        const values: Partial<Env> = {
          WHATSAPP_APP_SECRET: appSecret,
        };
        return values[key] as Env[typeof key];
      },
    };
    const service = new NotificationsService(env, testPrisma());
    const rawBody = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }));
    const signature = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

    expect(service.verifyWebhookSignature(rawBody, signature)).toBe(true);
    expect(service.verifyWebhookSignature(Buffer.from("{}"), signature)).toBe(false);
  });
});

function testPrisma(): ConstructorParameters<typeof NotificationsService>[1] {
  return {
    shop: {
      findUniqueOrThrow: vi.fn(),
    },
    whatsappTemplate: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as ConstructorParameters<typeof NotificationsService>[1];
}
