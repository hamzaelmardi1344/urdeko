import { AdminShell } from "@/components/admin/AdminShell";
import { listAdminUsers } from "@/lib/admin/queries";
import { requireAdmin, isAdminEmail } from "@/lib/admin/auth";

export const metadata = { title: "Utilisateurs" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const { items, total } = await listAdminUsers({ page, pageSize: 30 });

  return (
    <AdminShell
      userEmail={email}
      title="Utilisateurs"
      subtitle={`${total.toLocaleString("fr-MA")} comptes UrdeKo`}
    >
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
                const admin = isAdminEmail(u.email);
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
                      {admin ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
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

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
