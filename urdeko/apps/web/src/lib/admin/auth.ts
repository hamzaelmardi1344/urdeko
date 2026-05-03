import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { ensureBackofficeSchema } from "@/lib/db/bootstrap";
import { users } from "@/lib/db/schema";
import { isBootstrapSuperAdminEmail, normalizeAdminEmail } from "./emails";

export type BackofficeRole = "partner" | "super_admin";

export type BackofficeUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: BackofficeRole;
};

type BackofficeAuthResult = {
  session: Session | null;
  email: string;
  user: BackofficeUser;
};

export class AdminForbiddenError extends Error {
  constructor(message = "Accès backoffice refusé") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

function toBackofficeUser(row: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}): BackofficeUser | null {
  if (row.role !== "partner" && row.role !== "super_admin") return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: row.role,
  };
}

export async function resolveBackofficeUser(emailInput: unknown): Promise<BackofficeUser | null> {
  const email = normalizeAdminEmail(emailInput);
  if (!email) return null;
  await ensureBackofficeSchema();

  if (isBootstrapSuperAdminEmail(email)) {
    const now = new Date();
    const [row] = await db
      .insert(users)
      .values({ email, role: "super_admin", emailVerified: now })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: "super_admin", emailVerified: now },
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
      });
    return row ? toBackofficeUser(row) : null;
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ? toBackofficeUser(row) : null;
}

export async function requireBackoffice(
  opts: { redirectOnFail?: boolean } = {},
): Promise<BackofficeAuthResult> {
  const { redirectOnFail = true } = opts;
  const session = await auth();
  const email = normalizeAdminEmail(session?.user?.email);
  const user = email ? await resolveBackofficeUser(email) : null;

  if (!user) {
    if (redirectOnFail) {
      redirect(email ? "/acces-admin-refuse" : "/admin/connexion");
    }
    throw new AdminForbiddenError();
  }

  return { session, email: user.email, user };
}

export async function requireSuperAdmin(
  opts: { redirectOnFail?: boolean } = {},
): Promise<BackofficeAuthResult> {
  const result = await requireBackoffice(opts);
  if (result.user.role !== "super_admin") {
    if (opts.redirectOnFail ?? true) {
      redirect("/acces-admin-refuse");
    }
    throw new AdminForbiddenError("Accès super admin requis");
  }
  return result;
}

export function canManageProduct(
  user: BackofficeUser,
  product: { ownerUserId?: string | null },
): boolean {
  if (user.role === "super_admin") return true;
  return Boolean(product.ownerUserId && product.ownerUserId === user.id);
}

/** @deprecated Use requireBackoffice or requireSuperAdmin explicitly. */
export async function requireAdmin(opts: { redirectOnFail?: boolean } = {}) {
  return requireSuperAdmin(opts);
}

/** @deprecated Use persisted users.role instead. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return isBootstrapSuperAdminEmail(email);
}
