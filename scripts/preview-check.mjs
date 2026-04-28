import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...readDotenv(resolve(process.cwd(), ".env")), ...process.env };
const appEnv = env.APP_ENV ?? "local";
const strictPreview = appEnv === "preview";
const errors = [];
const warnings = [];

const mobileRequired = [
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_WEB_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
];
const apiRequired = [
  "PUBLIC_API_URL",
  "PUBLIC_WEB_URL",
  "DATABASE_URL",
  "REDIS_URL",
  "MASTER_ENCRYPTION_KEY_BASE64",
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
];

for (const key of mobileRequired) requireValue(key, "mobile public env");
for (const key of apiRequired) requireValue(key, "API env");

validateUrl("EXPO_PUBLIC_API_URL");
validateUrl("PUBLIC_API_URL");
validateUrl("EXPO_PUBLIC_WEB_URL");
validateUrl("PUBLIC_WEB_URL");
validateAndroidApiUrl("EXPO_PUBLIC_API_URL");

warnOptionalGroup("Cloudflare R2", [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
]);
warnOptionalGroup("Instagram", ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"]);
warnOptionalGroup("WhatsApp Cloud", [
  "WHATSAPP_BUSINESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
]);
warnOptionalGroup("Paddle", [
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
  "PADDLE_PRO_PRICE_ID",
  "PADDLE_BUSINESS_PRICE_ID",
]);
warnOptionalGroup("Claude", ["ANTHROPIC_API_KEY"]);
warnOptionalGroup("Sentry mobile sourcemaps", [
  "EXPO_PUBLIC_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_AUTH_TOKEN",
]);
warnOptionalGroup("PostHog mobile analytics", ["EXPO_PUBLIC_POSTHOG_API_KEY"]);

console.log(`Jibi preview check (${strictPreview ? "strict preview" : "local advisory"})`);

if (warnings.length > 0) {
  console.log("\nWarnings / actions before a real preview:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("\nBlocking preview issues:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("\nPreview check passed.");

function requireValue(key, scope) {
  if (hasUsableValue(key)) return;
  const message = `${scope}: ${key} is missing`;
  if (strictPreview) errors.push(message);
  else warnings.push(message);
}

function validateUrl(key) {
  const value = env[key];
  if (!value) return;
  try {
    new URL(value);
  } catch {
    const message = `${key} must be a valid URL`;
    if (strictPreview) errors.push(message);
    else warnings.push(message);
  }
}

function validateAndroidApiUrl(key) {
  const value = env[key];
  if (!value || !strictPreview) return;
  let url;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") {
    errors.push(`${key} must use HTTPS for Android preview builds`);
  }
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    errors.push(`${key} must not point to localhost for Android preview builds`);
  }
}

function warnOptionalGroup(label, keys) {
  const missing = keys.filter((key) => !hasUsableValue(key));
  if (missing.length > 0) {
    warnings.push(`${label}: missing ${missing.join(", ")}`);
  }
}

function hasUsableValue(key) {
  const value = env[key];
  return Boolean(value && !value.startsWith("replace_with_"));
}

function readDotenv(path) {
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    entries[key] = stripQuotes(rawValue);
  }
  return entries;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
