import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { listAdminJobs } from "@/lib/admin/queries";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { adminRetryJobAction } from "@/lib/admin/actions";

export const metadata = { title: "Jobs IA" };
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  analyze_photo: "Analyse photo",
  empty_room: "Vidage pièce",
  render: "Rendu final",
  advice: "Conseils",
};

const STATUS_TINTS: Record<string, string> = {
  queued: "bg-outline/10 text-on-surface-variant",
  running: "bg-primary-container/40 text-on-primary-container",
  succeeded: "bg-emerald-500/15 text-emerald-700",
  failed: "bg-error/15 text-error",
};

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email, user } = await requireSuperAdmin();
  const sp = await searchParams;
  const status = sp.status ?? "";
  const kind = sp.kind ?? "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const { items, total } = await listAdminJobs({
    page,
    pageSize: 50,
    status: status || null,
    kind: kind || null,
  });

  return (
    <AdminShell
      userEmail={email}
      role={user.role}
      title="Jobs IA"
      subtitle={`${total.toLocaleString("fr-MA")} exécutions enregistrées`}
    >
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-outline/10 bg-surface-container-lowest p-3">
        <FilterChip href="/admin/jobs" active={!status && !kind} label="Tout" />
        <FilterChip href="/admin/jobs?status=failed" active={status === "failed"} label="Échoués" />
        <FilterChip
          href="/admin/jobs?status=running"
          active={status === "running"}
          label="En cours"
        />
        <FilterChip
          href="/admin/jobs?status=succeeded"
          active={status === "succeeded"}
          label="Réussis"
        />
        <div className="mx-2 h-6 w-px bg-outline/10" />
        <FilterChip
          href="/admin/jobs?kind=analyze_photo"
          active={kind === "analyze_photo"}
          label="Analyse"
        />
        <FilterChip
          href="/admin/jobs?kind=empty_room"
          active={kind === "empty_room"}
          label="Empty room"
        />
        <FilterChip href="/admin/jobs?kind=render" active={kind === "render"} label="Rendu" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-outline/10 bg-surface-container-lowest">
        <table className="min-w-[900px] w-full border-collapse text-sm">
          <thead className="bg-surface-container-low text-left text-xs uppercase tracking-widest text-on-surface-variant/70">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Projet / User</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Progression</th>
              <th className="p-3">Durée</th>
              <th className="p-3">Créé</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-on-surface-variant">
                  Aucun job pour ces filtres.
                </td>
              </tr>
            ) : (
              items.map((j) => (
                <tr key={j.id} className="border-t border-outline/5 align-top">
                  <td className="p-3">
                    <p className="font-bold">{KIND_LABELS[j.kind] ?? j.kind}</p>
                    <p className="text-xs text-on-surface-variant">{j.kind}</p>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/projets/${j.projectId}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {j.projectName ?? j.projectId.slice(0, 8)}
                    </Link>
                    {j.userEmail ? (
                      <p className="text-xs text-on-surface-variant">{j.userEmail}</p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        STATUS_TINTS[j.status] ?? "bg-outline/10",
                      ].join(" ")}
                    >
                      {j.status}
                    </span>
                    {j.error ? (
                      <details className="mt-1 max-w-xs">
                        <summary className="cursor-pointer text-xs text-error">
                          voir erreur
                        </summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-error/5 p-2 text-[11px] leading-snug text-error">
                          {j.error}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-outline/20">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${j.progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-on-surface-variant">
                        {j.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-xs tabular-nums text-on-surface-variant">
                    {j.durationMs != null
                      ? `${(j.durationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </td>
                  <td className="p-3 text-xs text-on-surface-variant">
                    {formatDate(j.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    {j.status === "failed" ? (
                      <form action={adminRetryJobAction}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-outline/20 px-3 py-1 text-xs font-bold hover:bg-surface-container-low"
                        >
                          Relancer
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/jobs" page={page} total={total} pageSize={50} params={sp} />
    </AdminShell>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "border border-outline/20 hover:bg-surface-container-low",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function Pagination({
  basePath,
  page,
  total,
  pageSize,
  params,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const qp = (p: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
    s.set("page", String(p));
    return `${basePath}?${s.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 text-sm">
      <span className="text-on-surface-variant">
        Page {page + 1} / {pages}
      </span>
      <div className="flex gap-2">
        {page > 0 ? (
          <Link
            href={qp(page - 1)}
            className="rounded-full border border-outline/20 px-4 py-1.5 font-bold"
          >
            Précédent
          </Link>
        ) : null}
        {page + 1 < pages ? (
          <Link
            href={qp(page + 1)}
            className="rounded-full border border-outline/20 px-4 py-1.5 font-bold"
          >
            Suivant
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
