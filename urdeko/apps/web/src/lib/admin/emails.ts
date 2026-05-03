import { env } from "@/env";

export function normalizeAdminEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

export function configuredSuperAdminEmails(): string[] {
  const configured = parseEmailList(env.SUPER_ADMIN_EMAILS as unknown);
  if (configured.length > 0) return configured;

  // Transition prod: old deployments may still only have ADMIN_EMAILS.
  // Use the first legacy entry as a one-person bootstrap, then invite partners from DB.
  return parseEmailList(env.ADMIN_EMAILS as unknown).slice(0, 1);
}

function parseEmailList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return Array.from(
    new Set(
      raw
        .map((email) => normalizeAdminEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

export function isBootstrapSuperAdminEmail(value: unknown): boolean {
  const email = normalizeAdminEmail(value);
  return Boolean(email && configuredSuperAdminEmails().includes(email));
}
