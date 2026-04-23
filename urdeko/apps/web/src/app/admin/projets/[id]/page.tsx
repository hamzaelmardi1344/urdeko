import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminProjectDetail } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/auth";
import {
  adminDeleteProjectAction,
  adminRetryJobAction,
} from "@/lib/admin/actions";

export const metadata = { title: "Projet" };
export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { email } = await requireAdmin();
  const { id } = await params;
  const data = await getAdminProjectDetail(id);
  if (!data) notFound();

  const { project, photos, contact, renders, jobs } = data;

  return (
    <AdminShell
      userEmail={email}
      title={project.name}
      subtitle={`Projet ${project.id}`}
      action={
        <form action={adminDeleteProjectAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="rounded-full border border-error/30 px-4 py-2 text-sm font-bold text-error hover:bg-error/5"
          >
            Supprimer le projet
          </button>
        </form>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
            Résumé
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Statut" value={project.status} />
            <Row label="Pièce" value={project.roomType ?? "—"} />
            <Row label="Style" value={project.style ?? "—"} />
            <Row label="Palette" value={project.palette ?? "—"} />
            <Row label="Budget" value={`${project.budgetMad.toLocaleString("fr-MA")} MAD`} />
            <Row label="Flexibilité" value={`${project.flexibility}%`} />
            <Row label="Créé" value={formatDate(project.createdAt)} />
            <Row label="Mis à jour" value={formatDate(project.updatedAt)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
            Utilisateur
          </h3>
          {project.userEmail ? (
            <div className="space-y-1 text-sm">
              <p className="font-bold">{project.userName ?? project.userEmail}</p>
              <p className="text-on-surface-variant">{project.userEmail}</p>
              <Link
                href={`/admin/users?search=${encodeURIComponent(project.userEmail)}`}
                className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
              >
                Voir tous ses projets →
              </Link>
            </div>
          ) : (
            <p className="text-sm italic text-on-surface-variant">
              Invité (guestId : {project.guestId ?? "—"})
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
            Contact
          </h3>
          {contact ? (
            <div className="space-y-1 text-sm">
              <p className="font-bold">{contact.fullName}</p>
              <p className="text-on-surface-variant">{contact.email}</p>
              <p className="text-on-surface-variant">{contact.city}</p>
              {contact.phone ? (
                <p className="text-on-surface-variant">{contact.phone}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold">
                {contact.wantsEmail ? (
                  <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-on-primary-container">
                    email
                  </span>
                ) : null}
                {contact.wantsCallback ? (
                  <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-on-primary-container">
                    rappel
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-on-surface-variant">Pas encore de contact</p>
          )}
        </section>
      </div>

      {photos.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
            Photos
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant/70">
                  Originale
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.originalUrl}
                  alt="original"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                {p.emptiedUrl ? (
                  <>
                    <p className="mb-1 mt-3 text-[10px] font-bold uppercase text-on-surface-variant/70">
                      Vidée
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.emptiedUrl}
                      alt="vidée"
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {renders.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
            Rendus générés
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renders.map((r) => (
              <div key={r.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.imageUrl}
                  alt="rendu"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <p className="text-xs text-on-surface-variant">
                  v{r.version} · {formatDate(r.createdAt)}
                </p>
                {r.advice ? (
                  <p className="rounded-md bg-primary-container/20 p-2 text-xs">
                    {r.advice}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
          Timeline jobs IA
        </h3>
        {jobs.length === 0 ? (
          <p className="text-sm italic text-on-surface-variant">Aucun job.</p>
        ) : (
          <ol className="space-y-2">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 text-sm"
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    j.status === "succeeded"
                      ? "bg-emerald-500"
                      : j.status === "failed"
                        ? "bg-error"
                        : j.status === "running"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-outline",
                  ].join(" ")}
                />
                <span className="font-bold">{j.kind}</span>
                <span className="text-xs uppercase tracking-widest text-on-surface-variant/70">
                  {j.status}
                </span>
                <span className="text-xs tabular-nums text-on-surface-variant">
                  {j.progress}%
                </span>
                <span className="ml-auto text-xs text-on-surface-variant">
                  {formatDate(j.createdAt)}
                </span>
                {j.status === "failed" ? (
                  <form action={adminRetryJobAction}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-outline/20 px-3 py-1 text-xs font-bold"
                    >
                      Relancer
                    </button>
                  </form>
                ) : null}
                {j.error ? (
                  <details className="w-full">
                    <summary className="cursor-pointer text-xs text-error">
                      Erreur
                    </summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-error/5 p-2 text-[11px] text-error">
                      {j.error}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
