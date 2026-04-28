import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { productImageUploadInputSchema, productImageUploadSchema } from "@bep/shared-types";
import type { Env } from "../config/env";

type UploadsEnv = {
  get<K extends keyof Env>(key: K): Env[K];
};

@Injectable()
export class UploadsService {
  constructor(private readonly env: UploadsEnv) {}

  async createProductImageUpload(shopId: string, input: unknown) {
    const parsed = productImageUploadInputSchema.parse(input);
    const config = this.r2Config();
    const extension = this.extensionFor(parsed.contentType);
    const key = `shops/${shopId}/products/${randomUUID()}.${extension}`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
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

  private r2Config() {
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

  private extensionFor(contentType: string): string {
    if (contentType === "image/png") return "png";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/heic") return "heic";
    if (contentType === "image/heif") return "heif";
    return "jpg";
  }
}
