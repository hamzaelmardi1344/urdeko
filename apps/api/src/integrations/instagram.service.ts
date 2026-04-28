import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  instagramImportResultSchema,
  instagramMediaSchema,
  type ConnectInstagramInput,
  type InstagramImportInput,
} from "@bep/shared-types";
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
    const state = this.signOAuthState(shopId);
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", resolvedRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
    url.searchParams.set("state", state);
    return { url: url.toString(), state, redirectUri: resolvedRedirectUri };
  }

  async connect(shopId: string, input: ConnectInstagramInput) {
    const tokenResult =
      "accessToken" in input
        ? { accessToken: input.accessToken }
        : await this.exchangeCode(this.validatedCodeInput(shopId, input));
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

  async importRecentMedia(shopId: string, input: InstagramImportInput) {
    const resolvedAccessToken = input.accessToken ?? (await this.storedAccessToken(shopId));
    const url = new URL(
      `https://graph.facebook.com/${this.env.get("META_GRAPH_VERSION")}/me/media`,
    );
    url.searchParams.set("fields", "id,media_type,caption,media_url,permalink,timestamp");
    url.searchParams.set("limit", String(input.limit));
    url.searchParams.set("access_token", resolvedAccessToken);
    const response = await fetch(url.toString());
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`Instagram import failed with ${response.status}`);
    const data = this.record(payload).data;
    if (!Array.isArray(data)) throw new Error("Instagram media payload is invalid");
    const created = [];
    let skipped = 0;
    for (const item of data) {
      const record = this.record(item);
      const mediaType = record.media_type;
      if (mediaType !== "IMAGE" && mediaType !== "CAROUSEL_ALBUM") continue;
      const media = instagramMediaSchema.parse({
        id: record.id,
        mediaType,
        caption: typeof record.caption === "string" ? record.caption : "",
        mediaUrl: record.media_url,
        permalink: record.permalink,
        timestamp: record.timestamp,
      });
      const existing = await this.prisma.product.findFirst({
        where: { shopId, sourceInstagramPostId: media.id },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
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
    return instagramImportResultSchema.parse({
      imported: created.length,
      skipped,
      products: created,
    });
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
        "META_GRAPH_VERSION",
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

  private validatedCodeInput(
    shopId: string,
    input: Extract<ConnectInstagramInput, { code: string }>,
  ): { code: string; redirectUri: string } {
    this.validateOAuthState(shopId, input.state);
    return { code: input.code, redirectUri: input.redirectUri };
  }

  private signOAuthState(shopId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        shopId,
        nonce: randomBytes(16).toString("hex"),
        exp: Date.now() + 10 * 60 * 1000,
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", this.stateSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  }

  private validateOAuthState(shopId: string, state: string): void {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) {
      throw new BadRequestException("Instagram OAuth state is invalid");
    }
    const expectedSignature = createHmac("sha256", this.stateSecret())
      .update(payload)
      .digest("base64url");
    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(signature);
    if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) {
      throw new BadRequestException("Instagram OAuth state signature is invalid");
    }
    let record: Record<string, unknown>;
    try {
      const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      record = this.record(decoded);
    } catch {
      throw new BadRequestException("Instagram OAuth state payload is invalid");
    }
    if (record.shopId !== shopId || typeof record.exp !== "number" || record.exp < Date.now()) {
      throw new BadRequestException("Instagram OAuth state has expired");
    }
  }

  private stateSecret(): Buffer {
    return Buffer.from(this.env.get("MASTER_ENCRYPTION_KEY_BASE64"), "base64");
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
