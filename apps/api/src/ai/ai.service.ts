import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
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
    const productCopyTool = this.productCopyTool();
    const message = await anthropic.messages.create({
      model: this.env.get("ANTHROPIC_PRODUCT_MODEL"),
      max_tokens: 800,
      system:
        "Tu génères des fiches produits courtes et engageantes pour des boutiques marocaines. Style: chaleureux, vendeur, mélange darija + français autorisé. Utilise uniquement l'outil demandé.",
      tools: [productCopyTool],
      tool_choice: { type: "tool", name: productCopyTool.name },
      messages: [
        {
          role: "user",
          content: `Input JSON: ${JSON.stringify(parsed)}. Appelle l'outil product_copy avec une fiche courte, vendeuse et adaptée au Maroc.`,
        },
      ],
    });
    const toolBlock = message.content.find(
      (block) => block.type === "tool_use" && block.name === productCopyTool.name,
    );
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("Claude did not return structured product copy");
    }
    const result = aiProductCopySchema.parse(toolBlock.input);
    await this.redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 60 * 24 * 30);
    return result;
  }

  private productCopyTool(): Tool {
    return {
      name: "product_copy",
      description:
        "Generate short Moroccan social-commerce product copy in French, Arabic and Darija.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title_fr: { type: "string", minLength: 1, maxLength: 140 },
          title_ar: { type: "string", maxLength: 140 },
          description_fr: { type: "string", minLength: 1, maxLength: 1200 },
          description_darija: { type: "string", minLength: 1, maxLength: 1200 },
          hashtags_suggested: {
            type: "array",
            maxItems: 20,
            items: { type: "string", pattern: "^#[\\p{L}\\p{N}_]+$" },
          },
        },
        required: [
          "title_fr",
          "title_ar",
          "description_fr",
          "description_darija",
          "hashtags_suggested",
        ],
      },
    };
  }
}
