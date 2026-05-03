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
  const value = env.SUPER_ADMIN_EMAILS as unknown;
  const configured = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      configured
        .map((email) => normalizeAdminEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

export function isBootstrapSuperAdminEmail(value: unknown): boolean {
  const email = normalizeAdminEmail(value);
  return Boolean(email && configuredSuperAdminEmails().includes(email));
}
