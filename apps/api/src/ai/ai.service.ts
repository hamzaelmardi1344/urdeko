import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import Redis from "ioredis";
import { aiProductCopyInputSchema, aiProductCopySchema } from "@bep/shared-types";
import { EnvService } from "../config/env.service";

@Injectable()
export class AiService {
  private readonly redis: Redis;

  constructor(private readonly env: EnvService) {
    this.redis = new Redis(env.get("REDIS_URL"));
  }

  async generateProductCopy(input: unknown) {
    const parsed = aiProductCopyInputSchema.parse(input);
    const cacheKey = `ai:product-copy:${createHash("sha256")
      .update(JSON.stringify(parsed))
      .digest("hex")}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return aiProductCopySchema.parse(JSON.parse(cached));
    }
    const apiKey = this.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: this.env.get("ANTHROPIC_PRODUCT_MODEL"),
      max_tokens: 800,
      system:
        "Tu génères des fiches produits courtes et engageantes pour des boutiques marocaines. Style: chaleureux, vendeur, mélange darija + français autorisé. Format JSON strict.",
      messages: [
        {
          role: "user",
          content: `Input JSON: ${JSON.stringify(parsed)}. Return only JSON with title_fr, title_ar, description_fr, description_darija, hashtags_suggested.`,
        },
      ],
    });
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude did not return text content");
    }
    const result = aiProductCopySchema.parse(JSON.parse(textBlock.text));
    await this.redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 60 * 24 * 30);
    return result;
  }
}
