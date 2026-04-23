import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "@/env";

// =====================================================================
// Storage S3-compatible.
// - Prod : Cloudflare R2 (endpoint https://<account>.r2.cloudflarestorage.com)
// - Dev : MinIO (endpoint http://localhost:9000, forcePathStyle = true)
// Le client AWS SDK est identique ; seule la config change via env.
// =====================================================================

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export type UploadInput = {
  buffer: Buffer;
  contentType: string;
  keyPrefix?: string; // ex. "projects/{id}/photos"
  extension?: string;
};

export type UploadResult = {
  key: string;
  url: string;
};

export async function uploadObject({
  buffer,
  contentType,
  keyPrefix = "uploads",
  extension,
}: UploadInput): Promise<UploadResult> {
  const ext = extension ?? mimeToExt(contentType);
  const key = `${keyPrefix.replace(/\/$/, "")}/${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return { key, url: publicUrl(key) };
}

export async function signedPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn: params.expiresInSeconds ?? 300 },
  );
}

export async function signedGetUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

export function publicUrl(key: string): string {
  return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}
