import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { createSmtpTransport } from "@/lib/email/smtp";
import { db } from "@/lib/db/client";
import { users, verificationTokens } from "@/lib/db/schema";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { env } from "@/env";
import { isAdminAllowedEmail, normalizeAdminEmail } from "./emails";

const ADMIN_TOKEN_TTL_MS = 15 * 60 * 1000;

function adminTokenIdentifier(email: string): string {
  return `admin:${email}`;
}

function hashAdminToken(token: string): string {
  return createHash("sha256").update(`admin:${token}:${env.AUTH_SECRET}`).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function adminMagicEmailHtml(url: string): string {
  return `
<body style="background:#f8f5ef;margin:0;padding:24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0"
    style="max-width:560px;margin:auto;background:#fff;border-radius:16px;font-family:Helvetica,Arial,sans-serif;color:#2b2926;">
    <tr>
      <td style="padding:28px 28px 10px;text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;">UrdeKo Admin</div>
        <p style="margin:12px 0 0;color:#6f6a63;font-size:15px;line-height:1.5;">
          Utilise ce lien pour ouvrir le backoffice. Il expire dans 15 minutes.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:22px 28px;">
        <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer"
          style="display:inline-block;background:#a63300;color:#fff;text-decoration:none;border-radius:999px;
          padding:13px 24px;font-size:16px;font-weight:800;">
          Ouvrir le backoffice
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 28px;text-align:center;color:#8a8379;font-size:13px;line-height:1.45;">
        Si tu n'es pas à l'origine de cette demande, ignore cet email.
      </td>
    </tr>
  </table>
</body>`;
}

function adminMagicEmailText(url: string): string {
  return `UrdeKo Admin\nOuvre ce lien pour accéder au backoffice :\n${url}\n\nCe lien expire dans 15 minutes.\n`;
}

export async function sendAdminMagicLink(emailInput: unknown, origin: string): Promise<void> {
  const email = normalizeAdminEmail(emailInput);
  if (!email) return;

  if (!isAdminAllowedEmail(email)) {
    return;
  }

  const limit = await rateLimit(`admin:${email}`, RATE_LIMITS.authMagicLink);
  if (!limit.allowed) {
    throw new Error("Trop de liens demandés. Réessaie dans quelques minutes.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAdminToken(token);
  const identifier = adminTokenIdentifier(email);
  const expires = new Date(Date.now() + ADMIN_TOKEN_TTL_MS);

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({ identifier, token: tokenHash, expires });

  const url = new URL("/admin/session", origin);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);

  const transport = createSmtpTransport();
  const result = await transport.sendMail({
    to: email,
    from: env.AUTH_EMAIL_FROM,
    subject: "Accès admin UrdeKo",
    text: adminMagicEmailText(url.toString()),
    html: adminMagicEmailHtml(url.toString()),
  });

  const failed = [...(result.rejected ?? []), ...(result.pending ?? [])].filter(Boolean);
  if (failed.length) {
    throw new Error(`Email non délivré pour : ${failed.join(", ")}`);
  }
}

export async function consumeAdminMagicToken(emailInput: unknown, tokenInput: unknown) {
  const email = normalizeAdminEmail(emailInput);
  const token = typeof tokenInput === "string" ? tokenInput : "";
  if (!email || !token || !isAdminAllowedEmail(email)) return null;

  const [consumed] = await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, adminTokenIdentifier(email)),
        eq(verificationTokens.token, hashAdminToken(token)),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .returning();

  if (!consumed) return null;

  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({ email, emailVerified: now })
    .onConflictDoUpdate({
      target: users.email,
      set: { emailVerified: now },
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
    });

  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "Admin UrdeKo",
    image: user.image ?? undefined,
  };
}

export async function hasValidAdminMagicToken(
  emailInput: unknown,
  tokenInput: unknown,
): Promise<boolean> {
  const email = normalizeAdminEmail(emailInput);
  const token = typeof tokenInput === "string" ? tokenInput : "";
  if (!email || !token || !isAdminAllowedEmail(email)) return false;

  const [row] = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, adminTokenIdentifier(email)),
        eq(verificationTokens.token, hashAdminToken(token)),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  return Boolean(row);
}
