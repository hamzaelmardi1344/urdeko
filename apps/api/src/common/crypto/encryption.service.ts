import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptionEnv = {
  get(key: "MASTER_ENCRYPTION_KEY_BASE64"): string;
};

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(env: EncryptionEnv) {
    this.key = Buffer.from(env.get("MASTER_ENCRYPTION_KEY_BASE64"), "base64");
    if (this.key.byteLength !== 32) {
      throw new Error("MASTER_ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
  }

  decrypt(payload: string): string {
    const [ivBase64, tagBase64, ciphertextBase64] = payload.split(".");
    if (!ivBase64 || !tagBase64 || !ciphertextBase64) {
      throw new Error("Encrypted payload is malformed");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivBase64, "base64"));
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextBase64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }
}
