import { Injectable } from "@nestjs/common";
import { integrationStatusResponseSchema } from "@bep/shared-types";
import type { Env } from "../config/env";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

type ProviderStatusInput = {
  provider: "R2" | "INSTAGRAM" | "WHATSAPP" | "PADDLE" | "CLAUDE";
  configured: boolean;
  connected: boolean;
  mode: "missing" | "preview" | "sandbox" | "production";
  missingEnv: string[];
  action: string;
  lastCheckedAt: string;
};

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async status(shopId: string) {
    const [instagramIntegration, whatsappIntegration] = await Promise.all([
      this.prisma.shopIntegration.findUnique({
        where: { shopId_provider: { shopId, provider: "INSTAGRAM" } },
      }),
      this.prisma.shopIntegration.findUnique({
        where: { shopId_provider: { shopId, provider: "WHATSAPP" } },
      }),
    ]);
    const lastCheckedAt = new Date().toISOString();
    const providers: ProviderStatusInput[] = [
      this.providerStatus({
        provider: "R2",
        mode: "preview",
        requiredEnv: [
          "R2_ACCOUNT_ID",
          "R2_ACCESS_KEY_ID",
          "R2_SECRET_ACCESS_KEY",
          "R2_BUCKET",
          "R2_PUBLIC_BASE_URL",
        ],
        connected: false,
        readyAction: "Run the R2 verification test before uploading product photos",
        missingAction: "Add Cloudflare R2 credentials to the preview API environment",
        lastCheckedAt,
      }),
      this.providerStatus({
        provider: "INSTAGRAM",
        mode: "preview",
        requiredEnv: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "INSTAGRAM_REDIRECT_URI"],
        connected: Boolean(instagramIntegration),
        readyAction: instagramIntegration
          ? "Instagram is connected for this shop"
          : "Connect Instagram from the mobile app before importing posts",
        missingAction: "Add Meta Instagram OAuth credentials to the preview API environment",
        lastCheckedAt,
      }),
      this.providerStatus({
        provider: "WHATSAPP",
        mode: "preview",
        requiredEnv: [
          "WHATSAPP_BUSINESS_TOKEN",
          "WHATSAPP_PHONE_NUMBER_ID",
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          "WHATSAPP_APP_SECRET",
        ],
        connected: Boolean(whatsappIntegration),
        readyAction: "Send a WhatsApp template test to a verified recipient",
        missingAction: "Add WhatsApp Cloud API credentials to the preview API environment",
        lastCheckedAt,
      }),
      this.providerStatus({
        provider: "PADDLE",
        mode: this.env.get("PADDLE_ENVIRONMENT"),
        requiredEnv: [
          "PADDLE_API_KEY",
          "PADDLE_WEBHOOK_SECRET",
          "PADDLE_PRO_PRICE_ID",
          "PADDLE_BUSINESS_PRICE_ID",
        ],
        connected: false,
        readyAction: "Open a sandbox checkout and confirm the webhook updates the shop plan",
        missingAction: "Add Paddle sandbox API key, webhook secret and price IDs",
        lastCheckedAt,
      }),
      this.providerStatus({
        provider: "CLAUDE",
        mode: "preview",
        requiredEnv: ["ANTHROPIC_API_KEY", "ANTHROPIC_PRODUCT_MODEL"],
        connected: false,
        readyAction: "Generate a product fiche from the product editor",
        missingAction: "Add Anthropic credentials to enable AI product copy",
        lastCheckedAt,
      }),
    ];
    return integrationStatusResponseSchema.parse({ providers });
  }

  verifyR2() {
    return this.uploadsService.verifyR2();
  }

  private providerStatus(input: {
    provider: ProviderStatusInput["provider"];
    mode: "preview" | "sandbox" | "production";
    requiredEnv: (keyof Env)[];
    connected: boolean;
    readyAction: string;
    missingAction: string;
    lastCheckedAt: string;
  }): ProviderStatusInput {
    const missingEnv = this.missingEnv(input.requiredEnv);
    const configured = missingEnv.length === 0;
    return {
      provider: input.provider,
      configured,
      connected: input.connected,
      mode: configured ? input.mode : "missing",
      missingEnv,
      action: configured ? input.readyAction : input.missingAction,
      lastCheckedAt: input.lastCheckedAt,
    };
  }

  private missingEnv(keys: (keyof Env)[]): string[] {
    return keys.filter((key) => {
      const value = this.env.get(key);
      return value === undefined || value === "";
    });
  }
}
