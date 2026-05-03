import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { createTransport } from "nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { smtpServerOptions } from "./email/smtp";
import { db } from "./db/client";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { rateLimit, RATE_LIMITS } from "./rate-limit";
import { consumeAdminMagicToken } from "./admin/magic-link";
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
    Credentials({
      id: "admin-magic",
      name: "Admin Magic Link",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        return consumeAdminMagicToken(credentials?.email, credentials?.token);
      },
    }),
    Nodemailer({
      server: smtpServerOptions(),
      from: env.AUTH_EMAIL_FROM,
      async sendVerificationRequest({ identifier: to, url, provider }) {
        const limit = await rateLimit(to.toLowerCase(), RATE_LIMITS.authMagicLink);
        if (!limit.allowed) {
          throw new Error(
            "Trop de liens de connexion demandés. Réessaie dans quelques minutes.",
          );
        }
        const { host } = new URL(url);
        const transport = createTransport(provider.server);
        const result = await transport.sendMail({
          to,
          from: provider.from,
          subject: `Connexion à ${host}`,
          text: magicLinkEmailText(url, host),
          html: magicLinkEmailHtml(url, host),
        });
        const failed = [...(result.rejected ?? []), ...(result.pending ?? [])].filter(Boolean);
        if (failed.length) {
          throw new Error(`Email non délivré pour : ${failed.join(", ")}`);
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Premier sign-in : persister profil dans le JWT pour les requêtes suivantes.
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      // Indispensable pour le backoffice : sans ça, user.email est souvent
      // absent en JWT alors que le client le voit par d’autres chemins.
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.name === "string") session.user.name = token.name;
      return session;
    },
  },
});
