import Redis from "ioredis";
import { env } from "@/env";

// =====================================================================
// Rate limiter simple fenêtre fixe basé sur Redis (INCR + EXPIRE).
// En prod on pointe vers Upstash (TLS), en local vers le conteneur Docker.
// Pas de dépendance à @upstash/ratelimit pour garder un seul client.
// =====================================================================

let redisClient: Redis | null = null;

function getClient(): Redis {
  if (redisClient) return redisClient;
  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });
  redisClient.on("error", (err) => {
    console.error("[redis] error:", err.message);
  });
  return redisClient;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
};

type LimitConfig = {
  /** Nombre maximum d'appels autorisés dans la fenêtre. */
  limit: number;
  /** Taille de la fenêtre en secondes. */
  windowSec: number;
  /** Préfixe de la clé Redis pour isoler les compteurs par usage. */
  prefix: string;
};

export async function rateLimit(
  identifier: string,
  config: LimitConfig,
): Promise<RateLimitResult> {
  const client = getClient();
  const key = `rl:${config.prefix}:${identifier}`;
  const now = Date.now();
  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, config.windowSec);
    }
    const ttl = await client.ttl(key);
    const resetAt = now + ttl * 1000;
    const remaining = Math.max(0, config.limit - count);
    return {
      allowed: count <= config.limit,
      remaining,
      limit: config.limit,
      resetAt,
    };
  } catch (error) {
    console.error("[redis] rateLimit failed:", (error as Error).message);
    // Fail-open : on ne bloque pas l'utilisateur si Redis est injoignable,
    // mais on log l'incident pour Sentry.
    return {
      allowed: true,
      remaining: config.limit,
      limit: config.limit,
      resetAt: now + config.windowSec * 1000,
    };
  }
}

export const RATE_LIMITS = {
  /** 10 uploads photo / minute / IP ou userId. */
  upload: { limit: 10, windowSec: 60, prefix: "upload" },
  /** 20 générations IA / heure / utilisateur — coût Gemini élevé. */
  aiGenerate: { limit: 20, windowSec: 3600, prefix: "ai:gen" },
  /** 60 actions API générales / minute / IP. */
  api: { limit: 60, windowSec: 60, prefix: "api" },
  /** 5 magic-link / 15 min / email. */
  authMagicLink: { limit: 5, windowSec: 900, prefix: "auth:magic" },
} satisfies Record<string, LimitConfig>;

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
