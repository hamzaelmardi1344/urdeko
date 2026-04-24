import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db/client";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { env } from "@/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/** Corps email magic link (évite l’import interne @auth/core non typé côté TS). */
function magicLinkEmailHtml(url: string, host: string): string {
  const escapedHost = host.replace(/\./g, "&#8203;.");
  const btn = "#a63300";
  return `
<body style="background:#f9f9f9;">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background:#fff;max-width:600px;margin:auto;border-radius:10px;">
    <tr>
      <td align="center" style="padding:10px 0;font-size:20px;font-family:Helvetica,Arial,sans-serif;color:#444;">
        Connexion à <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr><td align="center" style="padding:16px 0;">
      <a href="${url}" target="_blank" rel="noreferrer"
        style="font-size:17px;font-family:Helvetica,Arial,sans-serif;color:#fff;text-decoration:none;
        background:${btn};border-radius:8px;padding:12px 24px;display:inline-block;font-weight:bold;">
        Ouvrir le lien de connexion
      </a>
    </td></tr>
    <tr><td align="center" style="padding:0 0 12px;font-size:14px;color:#666;font-family:Helvetica,Arial,sans-serif;">
      Si vous n’avez pas demandé cet email, ignorez-le.
    </td></tr>
  </table>
</body>`;
}

function magicLinkEmailText(url: string, host: string): string {
  return `Connexion à ${host}\n${url}\n\n`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Requis sur Vercel (hôte réel ≠ AUTH_URL strict) pour éviter des erreurs « Configuration ».
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/connexion",
    verifyRequest: "/connexion/verification",
    error: "/connexion/erreur",
  },
  providers: [
    Resend({
      apiKey: env.RESEND_API_KEY,
      from: env.AUTH_EMAIL_FROM,
      async sendVerificationRequest({ identifier: to, url, provider }) {
        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to,
            subject: `Connexion à ${host}`,
            html: magicLinkEmailHtml(url, host),
            text: magicLinkEmailText(url, host),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
            name?: string;
          };
          const detail = body.message ?? JSON.stringify(body);
          let hint = "";
          if (res.status === 403 && /not verified|domain/i.test(detail)) {
            hint =
              " Vérifie le domaine sur https://resend.com/domains ou mets AUTH_EMAIL_FROM sur « UrdeKo <onboarding@resend.dev> » (emails limités au compte Resend).";
          }
          if (res.status === 403 && /invalid.*api/i.test(detail)) {
            hint = " Vérifie RESEND_API_KEY sur Vercel.";
          }
          throw new Error(`Resend ${res.status}: ${detail}.${hint}`);
        }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
