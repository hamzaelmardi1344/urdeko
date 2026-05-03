import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { BeforeAfter } from "@/components/flow/BeforeAfter";
import { LinkButton } from "@/components/ui/LinkButton";
import { getAccessibleProjectBundle } from "@/lib/projects";
import { auth } from "@/lib/auth";

export const metadata = { title: "Votre rendu final" };

export default async function RenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, session] = await Promise.all([getAccessibleProjectBundle(id), auth()]);
  if (!bundle) notFound();
  if (!session?.user?.id) {
    redirect(`/projets/${id}/compte`);
  }
  if (bundle.project.userId !== session.user.id) {
    redirect(
      `/connexion/rattacher?projectId=${id}&next=${encodeURIComponent(
        `/projets/${id}/rendu`,
      )}`,
    );
  }
  const latest = bundle.renders[0];
  const beforeUrl = bundle.photos[0]?.originalUrl ?? bundle.photos[0]?.emptiedUrl ?? "";

  if (!latest || !beforeUrl) {
    return (
      <>
        <TopAppBar title="10 · Génération" backHref={`/projets/${id}/recapitulatif`} />
        <FlowShell bottomPadding="cta">
          <section className="flex flex-col items-center gap-4 py-20 text-center">
            <Icon name="hourglass_top" size={36} className="text-primary" />
            <h1 className="font-headline text-headline-sm font-extrabold tracking-tight">
              Le rendu n'est pas encore disponible.
            </h1>
            <p className="max-w-sm text-on-surface-variant">
              Retourne à l'étape précédente ou attends quelques instants supplémentaires.
            </p>
          </section>
        </FlowShell>
        <StickyCTA offset="bottom-8">
          <LinkButton href={`/projets/${id}/generation`}>Suivre la génération</LinkButton>
        </StickyCTA>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="10 · Rendu" />
      <FlowShell bottomPadding="cta">
        <section className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="auto_awesome" filled size={30} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Votre rendu UrdeKo
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {bundle.project.name} · version {latest.version}
          </p>
        </section>

        <BeforeAfter beforeUrl={beforeUrl} afterUrl={latest.imageUrl} />

        {latest.advice ? (
          <section className="mt-8 rounded-2xl bg-surface-container-lowest p-6 shadow-ambient">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Icon name="forum" filled size={20} />
              <span className="font-label text-[11px] font-bold uppercase tracking-widest">
                Le conseil UrdeKo
              </span>
            </div>
            <p className="font-body text-base italic leading-relaxed text-on-surface">
              {latest.advice}
            </p>
          </section>
        ) : null}

        <section className="mt-8 flex items-center justify-between rounded-2xl bg-surface-container-low p-5">
          <div>
            <p className="font-headline text-sm font-bold text-on-surface">
              Envoyé à {bundle.contact?.email ?? "votre adresse"}
            </p>
            <p className="text-xs text-on-surface-variant">
              Retrouve tes projets à tout moment dans ton tableau de bord.
            </p>
          </div>
          <Link
            href="/projets"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
          >
            <Icon name="arrow_forward" size={20} />
          </Link>
        </section>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <LinkButton href={`/projets/${id}/produits/preparation`} variant="secondary">
          Modifier ma sélection
        </LinkButton>
      </StickyCTA>
    </>
  );
}
