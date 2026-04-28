import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  updateWhatsappTemplateInputSchema,
  whatsappTemplateTypeSchema,
  whatsappTestTemplateInputSchema,
  whatsappTestTemplateResultSchema,
  type WhatsappTestTemplateInput,
} from "@bep/shared-types";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

type NotificationsEnv = {
  get<K extends keyof Env>(key: K): Env[K];
};

type NotificationsPrisma = Pick<PrismaService, "shop" | "whatsappTemplate">;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly env: NotificationsEnv,
    private readonly prisma: NotificationsPrisma,
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

  async testTemplate(shopId: string, input: unknown) {
    const parsed = whatsappTestTemplateInputSchema.parse(input);
    await this.prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: { id: true } });
    const templateName = this.defaultTemplateName(parsed.type);
    const result = await this.sendTemplate({
      toE164: parsed.toE164,
      templateName,
      languageCode: this.languageCode(parsed.language),
      variables: this.testVariables(parsed),
    });
    return whatsappTestTemplateResultSchema.parse({ ...result, templateName });
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
    const metrics = this.webhookMetrics(record);
    this.logger.log(
      `WhatsApp webhook received messages=${metrics.messages} statuses=${metrics.statuses}`,
    );
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

  private languageCode(language: WhatsappTestTemplateInput["language"]): string {
    return language === "fr" ? "fr" : "ar";
  }

  private testVariables(input: WhatsappTestTemplateInput): string[] {
    if (input.type === "ORDER_CONFIRMATION") return ["Cliente Jibi", "BEP-TEST", "99 MAD"];
    if (input.type === "ORDER_SHIPPED") return ["Cliente Jibi", "https://jibi.ma/track/test"];
    if (input.type === "ORDER_DELIVERED") return ["Cliente Jibi"];
    if (input.type === "CART_ABANDONED") return ["Cliente Jibi", "https://jibi.ma/test"];
    return ["Cliente Jibi"];
  }

  private webhookMetrics(payload: Record<string, unknown>): { messages: number; statuses: number } {
    let messages = 0;
    let statuses = 0;
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
      const entryRecord = this.toOptionalRecord(entry);
      const changes = Array.isArray(entryRecord.changes) ? entryRecord.changes : [];
      for (const change of changes) {
        const value = this.toOptionalRecord(this.toOptionalRecord(change).value);
        messages += Array.isArray(value.messages) ? value.messages.length : 0;
        statuses += Array.isArray(value.statuses) ? value.statuses.length : 0;
      }
    }
    return { messages, statuses };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    throw new Error("Payload must be an object");
  }

  private toOptionalRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    return {};
  }
}
