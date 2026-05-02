import { env } from "@/env";

export function normalizeAdminEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

export function isAdminAllowedEmail(value: unknown): boolean {
  const email = normalizeAdminEmail(value);
  return Boolean(email && env.ADMIN_EMAILS.includes(email));
}
