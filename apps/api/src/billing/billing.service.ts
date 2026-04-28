import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { billingCheckoutInputSchema, billingCheckoutSchema } from "@bep/shared-types";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

const paddleWebhookSchema = z.object({
  event_type: z.string(),
  data: z.record(z.unknown()),
});

@Injectable()
export class BillingService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  async createCheckout(shopId: string, input: unknown) {
    const parsed = billingCheckoutInputSchema.parse(input);
    const apiKey = this.env.get("PADDLE_API_KEY");
    if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
    const priceId =
      parsed.plan === "PRO"
        ? this.env.get("PADDLE_PRO_PRICE_ID")
        : this.env.get("PADDLE_BUSINESS_PRICE_ID");
    if (!priceId) throw new Error(`Paddle price ID for ${parsed.plan} is not configured`);
    const apiHost =
      this.env.get("PADDLE_ENVIRONMENT") === "production"
        ? "https://api.paddle.com"
        : "https://sandbox-api.paddle.com";
    const response = await fetch(`${apiHost}/transactions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: parsed.customerEmail },
        custom_data: { shopId, plan: parsed.plan },
        collection_mode: "automatic",
      }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`Paddle checkout failed with ${response.status}`);
    const data = this.record(this.record(payload).data);
    const checkout = this.record(data.checkout);
    const checkoutUrl = this.stringValue(checkout.url);
    const transactionId = this.stringValue(data.id);
    if (!checkoutUrl || !transactionId) {
      throw new Error("Paddle checkout response is missing checkout URL");
    }
    return billingCheckoutSchema.parse({ checkoutUrl, transactionId, plan: parsed.plan });
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.env.get("PADDLE_WEBHOOK_SECRET");
    if (!secret || !signature) return false;
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expected = Buffer.from(digest);
    const actual = Buffer.from(signature);
    return expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual);
  }

  async handleWebhook(payload: unknown): Promise<{ ok: true }> {
    const event = paddleWebhookSchema.parse(payload);
    const customData = this.record(event.data.custom_data);
    const shopId = this.stringValue(customData.shopId);
    if (!shopId) return { ok: true };

    if (
      event.event_type === "subscription.created" ||
      event.event_type === "subscription.updated"
    ) {
      const plan = z.enum(["PRO", "BUSINESS"]).parse(customData.plan);
      const paddleSubId = this.stringValue(event.data.id);
      if (!paddleSubId) throw new Error("Paddle subscription ID missing");
      await this.prisma.subscription.upsert({
        where: { shopId },
        update: {
          paddleSubId,
          plan,
          status: this.stringValue(event.data.status) ?? "active",
          renewsAt: this.dateValue(event.data.next_billed_at),
        },
        create: {
          shopId,
          paddleSubId,
          plan,
          status: this.stringValue(event.data.status) ?? "active",
          renewsAt: this.dateValue(event.data.next_billed_at),
        },
      });
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          plan,
          monthlyOrderQuota: plan === "PRO" ? 1_000_000 : 1_000_000,
          planSince: new Date(),
        },
      });
    }

    if (event.event_type === "subscription.cancelled") {
      const subscription = await this.prisma.subscription.findUnique({ where: { shopId } });
      if (!subscription) throw new NotFoundException("Subscription not found");
      await this.prisma.subscription.update({
        where: { shopId },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      await this.prisma.shop.update({
        where: { id: shopId },
        data: { plan: "FREE", monthlyOrderQuota: 20, planSince: new Date() },
      });
    }

    return { ok: true };
  }

  private record(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    return {};
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private dateValue(value: unknown): Date | undefined {
    const text = this.stringValue(value);
    return text ? new Date(text) : undefined;
  }
}
