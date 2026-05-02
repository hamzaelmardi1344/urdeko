import { env } from "@/env";

const BUILT_IN_ADMIN_EMAILS = ["hamza.elmardi@gmail.com", "mounafi@gmail.com"];

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

function configuredAdminEmails(): string[] {
  const value = env.ADMIN_EMAILS as unknown;
  const configured = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      [...BUILT_IN_ADMIN_EMAILS, ...configured]
        .map((email) => normalizeAdminEmail(email))
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

export function isAdminAllowedEmail(value: unknown): boolean {
  const email = normalizeAdminEmail(value);
  return Boolean(email && configuredAdminEmails().includes(email));
}
