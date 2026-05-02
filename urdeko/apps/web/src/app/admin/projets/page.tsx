import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { listAdminProjects } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Projets" };
export const dynamic = "force-dynamic";

const STATUS_TINTS: Record<string, string> = {
  draft: "bg-outline/10 text-on-surface-variant",
  photo_ok: "bg-primary-container/40 text-on-primary-container",
  elements_chosen: "bg-primary-container/40 text-on-primary-container",
  products_chosen: "bg-primary-container/40 text-on-primary-container",
  rendering: "bg-amber-500/15 text-amber-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  failed: "bg-error/15 text-error",
};

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email } = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status ?? "";
  const search = sp.search ?? "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const { items, total } = await listAdminProjects({
    page,
    pageSize: 30,
    status: status || null,
    search: search || null,
  });

  return (
    <AdminShell
      userEmail={email}
      title="Projets"
      subtitle={`${total.toLocaleString("fr-MA")} projets créés sur la plateforme`}
    >
      <form className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-outline/10 bg-surface-container-lowest p-3">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Rechercher nom ou email user…"
          className="flex-1 min-w-[240px] rounded-full border border-outline/20 bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-full border border-outline/20 bg-surface px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.keys(STATUS_TINTS).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-outline/10 bg-surface-container-lowest">
        <table className="min-w-[820px] w-full border-collapse text-sm">
          <thead className="bg-surface-container-low text-left text-xs uppercase tracking-widest text-on-surface-variant/70">
            <tr>
              <th className="p-3">Projet</th>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Progrès</th>
              <th className="p-3 text-right">Budget</th>
              <th className="p-3">MAJ</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-on-surface-variant">
                  Aucun projet.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-outline/5 hover:bg-surface-container-low">
                  <td className="p-3">
                    <Link
                      href={`/admin/projets/${p.id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-on-surface-variant">
                      {p.roomType ?? "—"} · {p.style ?? "—"}
                    </p>
                  </td>
                  <td className="p-3 text-sm">
                    {p.userEmail ? (
                      <>
                        <p>{p.userName || p.userEmail}</p>
                        <p className="text-xs text-on-surface-variant">{p.userEmail}</p>
                      </>
                    ) : (
                      <span className="text-xs italic text-on-surface-variant">
                        Invité
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        STATUS_TINTS[p.status] ?? "bg-outline/10",
                      ].join(" ")}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                      <Chip on={p.hasPhoto}>📸</Chip>
                      <Chip on={p.hasEmptied}>vidé</Chip>
                      <Chip on={p.hasRender}>rendu</Chip>
                      <Chip on={p.hasContact}>contact</Chip>
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold tabular-nums">
                    {p.budgetMad.toLocaleString("fr-MA")} MAD
                  </td>
                  <td className="p-3 text-xs text-on-surface-variant">
                    {formatDate(p.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Chip({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={[
        "rounded-full px-1.5 py-0.5",
        on
          ? "bg-emerald-500/15 text-emerald-700"
          : "bg-outline/10 text-on-surface-variant/60 line-through",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
