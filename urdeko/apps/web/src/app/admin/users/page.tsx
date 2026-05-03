import { Icon } from "@urdeko/design-system";
import { AdminShell } from "@/components/admin/AdminShell";
import { listAdminUsers } from "@/lib/admin/queries";
import { invitePartnerAction } from "@/lib/admin/actions";
import { requireSuperAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Utilisateurs" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email, user } = await requireSuperAdmin();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const invite = sp.invite;
  const inviteEmail = sp.email;

  const { items, total } = await listAdminUsers({ page, pageSize: 30 });

  return (
    <AdminShell
      userEmail={email}
      role={user.role}
      title="Utilisateurs"
      subtitle={`${total.toLocaleString("fr-MA")} comptes UrdeKo`}
    >
      <section className="mb-6 rounded-2xl border border-outline/10 bg-surface-container-lowest p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-headline text-lg font-extrabold tracking-tight">
              Inviter un partenaire
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              L'email reçoit un accès backoffice limité à ses propres produits.
            </p>
          </div>
          <form action={invitePartnerAction} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              name="email"
              required
              placeholder="partenaire@example.com"
              className="min-w-0 rounded-full border border-outline/20 bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary sm:min-w-[280px]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
            >
              <Icon name="person_add" size={18} />
              Inviter
            </button>
          </form>
        </div>
        {invite ? (
          <p
            className={[
              "mt-3 rounded-xl px-3 py-2 text-sm font-semibold",
              invite === "invalid"
                ? "bg-error/10 text-error"
                : "bg-emerald-500/10 text-emerald-700",
            ].join(" ")}
          >
            {invite === "sent"
              ? `Invitation envoyée à ${inviteEmail ?? "ce partenaire"}.`
              : invite === "created"
                ? `Partenaire créé. L'envoi email a échoué, il pourra demander un lien depuis /admin/connexion.`
                : "Email partenaire invalide."}
          </p>
        ) : null}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-outline/10 bg-surface-container-lowest">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead className="bg-surface-container-low text-left text-xs uppercase tracking-widest text-on-surface-variant/70">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Rôle</th>
              <th className="p-3 text-right">Projets</th>
              <th className="p-3">Dernière activité</th>
              <th className="p-3">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-on-surface-variant">
                  Pas encore d&apos;utilisateurs.
                </td>
              </tr>
            ) : (
              items.map((u) => {
                return (
                  <tr
                    key={u.id}
                    className="border-t border-outline/5 hover:bg-surface-container-low"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt={u.name ?? u.email}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                            {u.email.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{u.name ?? u.email}</p>
                          <p className="text-xs text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums">
                      {u.projectCount}
                    </td>
                    <td className="p-3 text-xs text-on-surface-variant">
                      {u.lastActivityAt ? formatDate(new Date(u.lastActivityAt)) : "—"}
                    </td>
                    <td className="p-3 text-xs text-on-surface-variant">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function RoleBadge({ role }: { role: "customer" | "partner" | "super_admin" }) {
  const map = {
    super_admin: "bg-primary text-on-primary",
    partner: "bg-emerald-500/15 text-emerald-700",
    customer: "bg-outline/10 text-on-surface-variant",
  } as const;
  const label = {
    super_admin: "Super admin",
    partner: "Partenaire",
    customer: "Client",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${map[role]}`}>
      {label[role]}
    </span>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
