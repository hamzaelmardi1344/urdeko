import { Injectable } from "@nestjs/common";
import { instagramMediaSchema } from "@bep/shared-types";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InstagramService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  async importRecentMedia(shopId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/${this.env.get(
        "WHATSAPP_GRAPH_VERSION",
      )}/me/media?fields=id,media_type,caption,media_url,permalink,timestamp&limit=50&access_token=${encodeURIComponent(
        accessToken,
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
    return { imported: created.length, products: created };
  }

  private record(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value));
    }
    throw new Error("Instagram payload must be an object");
  }
}
