import Link from "next/link";
import { Icon } from "@urdeko/design-system";
import { AdminShell } from "@/components/admin/AdminShell";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { requireBackoffice } from "@/lib/admin/auth";
import { listAdminProducts } from "@/lib/admin/products";
import { getDashboardStats, getRecentProjects } from "@/lib/admin/stats";

export const metadata = { title: "Tableau de bord" };

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { email, user } = await requireBackoffice();

  if (user.role === "partner") {
    const { total } = await listAdminProducts({ viewer: user, pageSize: 1 });
    return (
      <AdminShell
        userEmail={email}
        role={user.role}
        title="Espace partenaire"
        subtitle="Gère tes produits publiés dans UrdeKo"
        action={
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary shadow-glow-sm"
          >
            <Icon name="add" size={18} />
            Ajouter un produit
          </Link>
        }
      >
        <MotionStagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" staggerChildren={0.04}>
          <MotionStaggerItem>
            <KpiCard
              label="Mes produits"
              value={total}
              sub="publiés immédiatement dans le flow client"
              icon="inventory_2"
              tint={total === 0 ? "warning" : "success"}
            />
          </MotionStaggerItem>
        </MotionStagger>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SectionCard title="Catalogue partenaire">
            <p className="text-sm text-on-surface-variant">
              Ajoute, modifie et duplique uniquement les produits rattachés à ton compte.
            </p>
            <Link
              href="/admin/produits"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            >
              <Icon name="inventory_2" size={18} />
              Ouvrir mes produits
            </Link>
          </SectionCard>
          <SectionCard title="Import web">
            <p className="text-sm text-on-surface-variant">
              Importe des produits depuis une boutique, puis vérifie les fiches avant publication.
            </p>
            <Link
              href="/admin/produits/scraper"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-outline/20 px-4 py-2 text-sm font-bold text-on-surface-variant"
            >
              <Icon name="travel_explore" size={18} />
              Importer depuis le web
            </Link>
          </SectionCard>
        </div>
      </AdminShell>
    );
  }

  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentProjects()]);

  const kpis: Array<{
    label: string;
    value: string | number;
    sub?: string;
    icon: string;
    tint: "primary" | "success" | "warning" | "error" | "neutral";
  }> = [
    {
      label: "Projets",
      value: stats.projects.total,
      sub: `+${stats.projects.last7d} cette semaine`,
      icon: "folder_open",
      tint: "primary",
    },
    {
      label: "Utilisateurs",
      value: stats.users.total,
      sub: `+${stats.users.last7d} cette semaine`,
      icon: "group",
      tint: "neutral",
    },
    {
      label: "Produits catalogue",
      value: stats.products.total,
      sub: stats.products.total === 0 ? "⚠️ Catalogue vide — lance un import" : "Postgres",
      icon: "inventory_2",
      tint: stats.products.total === 0 ? "warning" : "success",
    },
    {
      label: "Jobs IA",
      value: stats.jobs.total,
      sub: `${stats.jobs.running} en cours · ${stats.jobs.failed24h} échecs 24h`,
      icon: "bolt",
      tint: stats.jobs.failed24h > 0 ? "error" : "success",
    },
    {
      label: "Photos vidées",
      value: stats.photos.emptied,
      sub: `sur ${stats.photos.total} uploadées`,
      icon: "auto_fix_high",
      tint: "primary",
    },
    {
      label: "Rendus finaux",
      value: stats.renders.total,
      sub: "images générées",
      icon: "image",
      tint: "primary",
    },
    {
      label: "Contacts",
      value: stats.contacts.total,
      sub: "leads capturés",
      icon: "forward_to_inbox",
      tint: "neutral",
    },
  ];

  return (
    <AdminShell
      userEmail={email}
      role={user.role}
      title="Tableau de bord"
      subtitle="Vue d'ensemble de l'activité UrdeKo en temps réel"
      action={
        <>
          <Link
            href="/admin/users#invite-partner"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary shadow-glow-sm"
          >
            <Icon name="person_add" size={18} />
            Inviter un partenaire
          </Link>
          <Link
            href="/admin/produits/scraper"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-outline/20 bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <Icon name="travel_explore" size={18} />
            Importer des produits
          </Link>
        </>
      }
    >
      <MotionStagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" staggerChildren={0.04}>
        {kpis.map((kpi) => (
          <MotionStaggerItem key={kpi.label}>
            <KpiCard {...kpi} />
          </MotionStaggerItem>
        ))}
      </MotionStagger>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <MotionIn className="lg:col-span-3">
          <SectionCard
            title="Projets récents"
            action={
              <Link
                href="/admin/projets"
                className="text-sm font-bold text-primary hover:underline"
              >
                Voir tout →
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState
                icon="folder_open"
                title="Aucun projet"
                description="Les projets de tes utilisateurs apparaîtront ici."
              />
            ) : (
              <ul className="divide-y divide-outline/10">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/60 text-on-primary-container">
                      <Icon name="folder_open" size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {p.style ?? "style ?"} · {p.budgetMad.toLocaleString("fr-MA")} MAD ·{" "}
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </MotionIn>

        <MotionIn className="lg:col-span-2" delay={0.05}>
          <SectionCard title="Jobs IA par type">
            {stats.jobKinds.length === 0 ? (
              <EmptyState
                icon="bolt"
                title="Aucun job encore"
                description="Les jobs IA apparaîtront ici dès le premier run."
              />
            ) : (
              <ul className="space-y-3">
                {stats.jobKinds.map((j) => {
                  const pct = j.total ? Math.round((j.succeeded / j.total) * 100) : 0;
                  return (
                    <li key={j.kind}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">{j.kind}</span>
                        <span className="text-on-surface-variant">
                          {j.succeeded}/{j.total} ok
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full ${j.failed > 0 ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </MotionIn>
      </div>

      {stats.recentErrors.length > 0 ? (
        <MotionIn className="mt-6" delay={0.1}>
          <SectionCard
            title="Erreurs récentes"
            action={
              <Link href="/admin/jobs" className="text-sm font-bold text-primary hover:underline">
                Voir tous les jobs →
              </Link>
            }
          >
            <ul className="space-y-2">
              {stats.recentErrors.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-xl bg-error/5 p-3 text-sm"
                >
                  <Icon name="error" size={18} className="shrink-0 text-error" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-error">{e.kind}</p>
                    <p className="truncate text-on-surface-variant">
                      {e.error ?? "(pas de message)"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/projets/${e.projectId}`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Projet
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </MotionIn>
      ) : null}
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  tint,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  tint: "primary" | "success" | "warning" | "error" | "neutral";
}) {
  const tints: Record<typeof tint, string> = {
    primary: "bg-primary-container/40 text-on-primary-container",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    error: "bg-error/10 text-error",
    neutral: "bg-surface-container text-on-surface-variant",
  };
  return (
    <div className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tints[tint]}`}
        >
          <Icon name={icon} size={20} filled />
        </span>
      </div>
      <p className="mt-4 font-headline text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm font-bold text-on-surface-variant">{label}</p>
      {sub ? <p className="mt-1 text-xs text-on-surface-variant/80">{sub}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg font-extrabold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-on-surface-variant">
      <Icon name={icon} size={32} />
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs">{description}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Brouillon", cls: "bg-surface-container text-on-surface-variant" },
    photo_ok: { label: "Photo ok", cls: "bg-primary-container/60 text-on-primary-container" },
    elements_chosen: { label: "Éléments", cls: "bg-primary-container/60 text-on-primary-container" },
    products_chosen: { label: "Produits", cls: "bg-primary/20 text-primary" },
    rendering: { label: "Rendu…", cls: "bg-amber-500/15 text-amber-700" },
    completed: { label: "Terminé", cls: "bg-emerald-500/15 text-emerald-700" },
    failed: { label: "Échec", cls: "bg-error/15 text-error" },
  };
  const s = map[status] ?? { label: status, cls: "bg-surface-container text-on-surface-variant" };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}
