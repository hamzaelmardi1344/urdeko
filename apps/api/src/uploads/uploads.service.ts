import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  integrationVerifyResultSchema,
  productImageUploadInputSchema,
  productImageUploadSchema,
} from "@bep/shared-types";
import type { Env } from "../config/env";

type UploadsEnv = {
  get<K extends keyof Env>(key: K): Env[K];
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

@Injectable()
export class UploadsService {
  constructor(private readonly env: UploadsEnv) {}

  async createProductImageUpload(shopId: string, input: unknown) {
    const parsed = productImageUploadInputSchema.parse(input);
    const config = this.r2Config();
    const extension = this.extensionFor(parsed.contentType);
    const key = `shops/${shopId}/products/${randomUUID()}.${extension}`;
    const client = this.r2Client(config);
    const expiresInSeconds = 300;
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: parsed.contentType,
      ContentLength: parsed.byteSize,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    const publicUrl = `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return productImageUploadSchema.parse({
      uploadUrl,
      publicUrl,
      headers: { "content-type": parsed.contentType },
      expiresAt,
    });
  }

  async verifyR2() {
    const checkedAt = new Date().toISOString();
    let cleanup: { client: S3Client; config: R2Config; key: string } | undefined;
    try {
      const config = this.r2Config();
      const client = this.r2Client(config);
      const key = `diagnostics/jibi-preview-${randomUUID()}.png`;
      cleanup = { client, config, key };
      const body = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      );
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: "image/png",
          ContentLength: body.byteLength,
        }),
      );
      const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
      const publicUrl = `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
      const publicResponse = await this.fetchPublicUrl(publicUrl);
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      cleanup = undefined;
      return integrationVerifyResultSchema.parse({
        provider: "R2",
        ok: publicResponse.ok,
        message: publicResponse.ok
          ? "R2 upload, object lookup and public URL are working"
          : "R2 upload works, but the public URL is not reachable",
        details: {
          bucket: config.bucket,
          contentLength: head.ContentLength ?? body.byteLength,
          publicStatus: publicResponse.status,
          publicUrlReachable: publicResponse.ok,
        },
        checkedAt,
      });
    } catch (error) {
      if (cleanup) {
        await cleanup.client
          .send(new DeleteObjectCommand({ Bucket: cleanup.config.bucket, Key: cleanup.key }))
          .catch(() => undefined);
      }
      return integrationVerifyResultSchema.parse({
        provider: "R2",
        ok: false,
        message: error instanceof Error ? error.message : "R2 verification failed",
        details: cleanup ? { key: cleanup.key } : undefined,
        checkedAt,
      });
    }
  }

  private r2Config(): R2Config {
    const accountId = this.env.get("R2_ACCOUNT_ID");
    const accessKeyId = this.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = this.env.get("R2_BUCKET");
    const publicBaseUrl = this.env.get("R2_PUBLIC_BASE_URL");
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      throw new Error("Cloudflare R2 credentials are not configured");
    }
    return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
  }

  private r2Client(config: R2Config): S3Client {
    return new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private async fetchPublicUrl(publicUrl: string): Promise<{ ok: boolean; status: number }> {
    const headResponse = await fetch(publicUrl, { method: "HEAD" });
    if (headResponse.ok || headResponse.status !== 405) {
      return { ok: headResponse.ok, status: headResponse.status };
    }
    const getResponse = await fetch(publicUrl, { method: "GET" });
    return { ok: getResponse.ok, status: getResponse.status };
  }

  private extensionFor(contentType: string): string {
    if (contentType === "image/png") return "png";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/heic") return "heic";
    if (contentType === "image/heif") return "heif";
    return "jpg";
  }
}
