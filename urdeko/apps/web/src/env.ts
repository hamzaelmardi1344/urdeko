import { z } from "zod";

// =====================================================================
// Validation stricte des variables d'environnement.
// Aucun service externe n'est optionnel : l'app refuse de booter si une
// variable requise est absente. En dev local, docker-compose fournit
// Postgres + MinIO (S3) + Inngest dev server + Redis.
// =====================================================================

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Core app
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),

  // Transactional emails (Resend)
  RESEND_API_KEY: z.string().min(1),
  AUTH_EMAIL_FROM: z.string().min(1),

  // Google Gemini
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_TEXT_MODEL: z.string().default("gemini-2.5-pro"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-3.1-flash-image-preview"),
  // Redimensionne la plus grande arête des photos avant envoi à Gemini.
  // 1536 est le sweet spot édition/vitesse documenté pour Flash Image.
  AI_IMAGE_MAX_EDGE: z.coerce.number().int().min(512).max(4096).default(1536),
  // Température pour « vider la pièce » : basse = moins d’hallucination de nouvelle pièce.
  AI_EMPTY_ROOM_TEMPERATURE: z.coerce.number().min(0.01).max(2).default(0.35),
  // Graine optionnelle (entier) pour stabiliser un peu les re-générations ; laisser vide = aléatoire.
  AI_EMPTY_ROOM_SEED: z
    .string()
    .optional()
    .transform((s) => {
      if (s == null || s.trim() === "") return undefined;
      const n = Number(s.trim());
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    }),

  // S3-compatible storage (Cloudflare R2 en prod, MinIO en local)
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Sanity CMS
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
  SANITY_API_TOKEN: z.string().min(1),
  SANITY_REVALIDATE_SECRET: z.string().min(16),

  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  INNGEST_BASE_URL: z.string().url().optional(),

  // Redis (rate limiting + future queue/cache)
  REDIS_URL: z.string().min(1),

  // Observabilité
  NEXT_PUBLIC_SENTRY_DSN: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),

  // Infos légales (paramétrées une fois, affichées dans les pages CGU/etc.)
  LEGAL_COMPANY_NAME: z.string().default("UrdeKo"),
  LEGAL_COMPANY_ADDRESS: z.string().default("Casablanca, Maroc"),
  LEGAL_CONTACT_EMAIL: z.string().email().default("hello@urdeko.app"),

  // Backoffice admin — liste d'emails autorisés (séparés par virgule).
  // Toute personne connectée dont l'email est dans cette liste accède à /admin.
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
});

// SKIP_ENV_VALIDATION=1 permet les builds CI/CD sans fournir toutes les clés
// (la validation reste stricte au démarrage du serveur applicatif).
// On skippe aussi automatiquement pendant `next build` via NEXT_PHASE (plus
// fiable que d'hériter de SKIP_ENV_VALIDATION dans les workers Next 15).
const SKIP_VALIDATION =
  process.env.SKIP_ENV_VALIDATION === "1" ||
  process.env.NEXT_PHASE === "phase-production-build";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !SKIP_VALIDATION) {
  const missing = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Variables d'environnement invalides ou manquantes :\n${missing}\n` +
      `Consulte .env.example puis duplique en .env.local, ou lance ./setup.sh.`,
  );
}

// En mode SKIP_VALIDATION (build sans clés complètes), on expose process.env
// directement — les appels réseau échoueront à l'usage réel, mais le build
// passe pour permettre un déploiement par étapes.
export const env = (
  parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>)
);
export type Env = z.infer<typeof envSchema>;
