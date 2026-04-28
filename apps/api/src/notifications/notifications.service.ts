import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { updateWhatsappTemplateInputSchema, whatsappTemplateTypeSchema } from "@bep/shared-types";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  listTemplates(shopId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { OR: [{ shopId }, { shopId: null }], active: true },
      orderBy: [{ shopId: "desc" }, { type: "asc" }],
    });
  }

  updateTemplate(shopId: string, input: unknown) {
    const parsed = updateWhatsappTemplateInputSchema.parse(input);
    return this.prisma.whatsappTemplate.update({
      where: { id: parsed.id, shopId },
      data: { body: parsed.body, active: parsed.active },
    });
  }

  async sendTemplate(input: {
    toE164: string;
    templateName: string;
    languageCode: string;
    variables: string[];
  }): Promise<{ messageId: string }> {
    const token = this.env.get("WHATSAPP_BUSINESS_TOKEN");
    const phoneNumberId = this.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneNumberId) {
      throw new Error("WhatsApp credentials are not configured");
    }
    const response = await fetch(
      `https://graph.facebook.com/${this.env.get("WHATSAPP_GRAPH_VERSION")}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.toE164,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            components: [
              {
                type: "body",
                parameters: input.variables.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      },
    );
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp template send failed with ${response.status}`);
    }
    const record = this.toRecord(payload);
    const messages = record.messages;
    if (!Array.isArray(messages)) throw new Error("WhatsApp response is missing message ID");
    const first = this.toRecord(messages[0]);
    const id = first.id;
    if (typeof id !== "string") throw new Error("WhatsApp message ID is invalid");
    return { messageId: id };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.env.get("WHATSAPP_APP_SECRET");
    if (!secret || !signature?.startsWith("sha256=")) return false;
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expected = Buffer.from(`sha256=${digest}`);
    const actual = Buffer.from(signature);
    return expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual);
  }

  async handleIncomingWebhook(payload: unknown): Promise<{ ok: true }> {
    const record = this.toRecord(payload);
    if (!record.object) {
      throw new Error("WhatsApp webhook payload is invalid");
    }
    return { ok: true };
  }

  defaultTemplateName(type: string): string {
    const parsed = whatsappTemplateTypeSchema.parse(type);
    if (parsed === "ORDER_CONFIRMATION") return "order_confirmation_v1";
    if (parsed === "ORDER_SHIPPED") return "order_shipped_v1";
    if (parsed === "ORDER_DELIVERED") return "order_delivered_v1";
    if (parsed === "CART_ABANDONED") return "cart_abandoned_v1";
    return "review_request_v1";
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    throw new Error("Payload must be an object");
  }
}
