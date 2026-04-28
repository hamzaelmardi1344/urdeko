import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { instagramImportResultSchema, instagramMediaSchema } from "@bep/shared-types";
import { Prisma } from "../../prisma/generated/client";
import { EncryptionService } from "../common/crypto/encryption.service";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InstagramService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  createOAuthUrl(shopId: string, redirectUri?: string) {
    const appId = this.env.get("INSTAGRAM_APP_ID");
    if (!appId) throw new Error("INSTAGRAM_APP_ID is not configured");
    const resolvedRedirectUri = redirectUri ?? this.env.get("INSTAGRAM_REDIRECT_URI");
    if (!resolvedRedirectUri) throw new Error("INSTAGRAM_REDIRECT_URI is not configured");
    const state = `${shopId}.${randomBytes(16).toString("hex")}`;
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", resolvedRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
    url.searchParams.set("state", state);
    return { url: url.toString(), state, redirectUri: resolvedRedirectUri };
  }

  async connect(
    shopId: string,
    input: { code: string; redirectUri: string } | { accessToken: string },
  ) {
    const tokenResult =
      "accessToken" in input ? { accessToken: input.accessToken } : await this.exchangeCode(input);
    const expiresInSeconds =
      "expiresInSeconds" in tokenResult ? tokenResult.expiresInSeconds : undefined;
    const profile = await this.fetchProfile(tokenResult.accessToken);
    const integration = await this.prisma.shopIntegration.upsert({
      where: { shopId_provider: { shopId, provider: "INSTAGRAM" } },
      update: {
        externalAccountId: profile.id,
        accessTokenEnc: this.encryption.encrypt(tokenResult.accessToken),
        scopes: this.toJson(["instagram_business_basic", "instagram_business_content_publish"]),
        expiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : undefined,
      },
      create: {
        shopId,
        provider: "INSTAGRAM",
        externalAccountId: profile.id,
        accessTokenEnc: this.encryption.encrypt(tokenResult.accessToken),
        scopes: this.toJson(["instagram_business_basic", "instagram_business_content_publish"]),
        expiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : undefined,
      },
    });
    return integration;
  }

  async importRecentMedia(shopId: string, accessToken?: string) {
    const resolvedAccessToken = accessToken ?? (await this.storedAccessToken(shopId));
    const response = await fetch(
      `https://graph.facebook.com/${this.env.get(
        "WHATSAPP_GRAPH_VERSION",
      )}/me/media?fields=id,media_type,caption,media_url,permalink,timestamp&limit=50&access_token=${encodeURIComponent(
        resolvedAccessToken,
      )}`,
    );
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`Instagram import failed with ${response.status}`);
    const data = this.record(payload).data;
    if (!Array.isArray(data)) throw new Error("Instagram media payload is invalid");
    const created = [];
    for (const item of data) {
      const record = this.record(item);
      const mediaType = record.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL_ALBUM" : "IMAGE";
      if (mediaType !== "IMAGE" && mediaType !== "CAROUSEL_ALBUM") continue;
      const media = instagramMediaSchema.parse({
        id: record.id,
        mediaType,
        caption: typeof record.caption === "string" ? record.caption : "",
        mediaUrl: record.media_url,
        permalink: record.permalink,
        timestamp: record.timestamp,
      });
      const title = media.caption.split("\n")[0]?.slice(0, 120) || "Produit Instagram";
      created.push(
        await this.prisma.product.create({
          data: {
            shopId,
            title,
            description: media.caption || title,
            priceMAD: 0,
            status: "DRAFT",
            sourceInstagramPostId: media.id,
            images: { create: [{ url: media.mediaUrl, position: 0 }] },
          },
          include: { images: true, variants: true },
        }),
      );
    }
    return instagramImportResultSchema.parse({ imported: created.length, products: created });
  }

  private async exchangeCode(input: { code: string; redirectUri: string }) {
    const appId = this.env.get("INSTAGRAM_APP_ID");
    const appSecret = this.env.get("INSTAGRAM_APP_SECRET");
    if (!appId || !appSecret) {
      throw new Error("Instagram OAuth credentials are not configured");
    }
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
      code: input.code,
    });
    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`Instagram OAuth exchange failed with ${response.status}`);
    const record = this.record(payload);
    const accessToken = record.access_token;
    if (typeof accessToken !== "string")
      throw new Error("Instagram OAuth response is missing access_token");
    const expiresIn = record.expires_in;
    return {
      accessToken,
      expiresInSeconds: typeof expiresIn === "number" ? expiresIn : undefined,
    };
  }

  private async fetchProfile(accessToken: string): Promise<{ id: string }> {
    const response = await fetch(
      `https://graph.facebook.com/${this.env.get(
        "WHATSAPP_GRAPH_VERSION",
      )}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`Instagram profile lookup failed with ${response.status}`);
    const record = this.record(payload);
    const id = record.id;
    if (typeof id !== "string") throw new Error("Instagram profile payload is missing id");
    return { id };
  }

  private async storedAccessToken(shopId: string): Promise<string> {
    const integration = await this.prisma.shopIntegration.findUnique({
      where: { shopId_provider: { shopId, provider: "INSTAGRAM" } },
    });
    if (!integration) throw new Error("Instagram is not connected for this shop");
    return this.encryption.decrypt(integration.accessTokenEnc);
  }

  private record(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    throw new Error("Instagram payload must be an object");
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    if (value === null) return "null";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.toJson(item));
    }
    if (typeof value === "object" && value !== null) {
      const output: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, nested] of Object.entries(value)) {
        if (nested !== undefined) output[key] = this.toJson(nested);
      }
      return output;
    }
    return String(value);
  }
}
