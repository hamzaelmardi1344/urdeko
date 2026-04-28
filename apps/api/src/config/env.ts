import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  MASTER_ENCRYPTION_KEY_BASE64: z.string().min(44),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  PUBLIC_WEB_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url(),
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default("https://app.posthog.com"),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  WHATSAPP_GRAPH_VERSION: z.string().default("v22.0"),
  WHATSAPP_BUSINESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_PRODUCT_MODEL: z.string().default("claude-sonnet-4-6"),
  AMANA_API_BASE_URL: z.string().url().optional(),
  AMANA_API_KEY: z.string().optional(),
  SPEEDAF_API_BASE_URL: z.string().url().optional(),
  SPEEDAF_API_KEY: z.string().optional(),
  SENDIT_API_BASE_URL: z.string().url().optional(),
  SENDIT_API_KEY: z.string().optional(),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  PADDLE_PRO_PRICE_ID: z.string().optional(),
  PADDLE_BUSINESS_PRICE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
