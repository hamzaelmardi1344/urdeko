import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env } from "@/env";

export class AdminForbiddenError extends Error {
  constructor(message = "Accès admin refusé") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

/**
 * Vérifie que l'utilisateur est connecté ET que son email est dans
 * la liste `ADMIN_EMAILS` de la config. Utilisable :
 *  - dans un Server Component → redirige vers `/connexion?next=/admin`
 *  - dans un Server Action / route → retourne la session ou throw
 */
export async function requireAdmin(opts: { redirectOnFail?: boolean } = {}) {
  const { redirectOnFail = true } = opts;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;

  const allowed = Boolean(email && env.ADMIN_EMAILS.includes(email));
  if (!allowed) {
    if (redirectOnFail) {
      redirect(
        email ? "/acces-admin-refuse" : `/connexion?next=${encodeURIComponent("/admin")}`,
      );
    }
    throw new AdminForbiddenError();
  }
  return { session, email: email! };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && env.ADMIN_EMAILS.includes(email.toLowerCase()));
}
