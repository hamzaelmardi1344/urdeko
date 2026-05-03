import { notFound, redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { PreparationScreen } from "@/components/flow/PreparationScreen";
import { RenderKickoff } from "@/components/flow/RenderKickoff";
import { getAccessibleProjectBundle } from "@/lib/projects";
import { auth } from "@/lib/auth";
import { LinkButton } from "@/components/ui/LinkButton";

export const metadata = { title: "Génération du rendu" };

export default async function GenerationPage({
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
        `/projets/${id}/generation`,
      )}`,
    );
  }
  const readyForRender = Boolean(
    bundle.contact &&
      bundle.project.style &&
      bundle.project.palette &&
      bundle.photos[0]?.emptiedUrl &&
      bundle.selections.length,
  );
  if (!readyForRender) {
    return (
      <>
        <TopAppBar title="10 · Génération" backHref={`/projets/${id}`} />
        <FlowShell bottomPadding="cta">
          <section className="flex flex-col items-center gap-4 py-20 text-center">
            <Icon name="checklist" size={36} className="text-primary" />
            <h1 className="font-headline text-headline-sm font-extrabold tracking-tight">
              Quelques étapes restent à finaliser
            </h1>
            <p className="max-w-sm text-on-surface-variant">
              Votre compte est prêt. Complétez le parcours avant de lancer le rendu final.
            </p>
            <LinkButton href={`/projets/${id}`} className="mt-4">
              Reprendre mon projet
            </LinkButton>
          </section>
        </FlowShell>
      </>
    );
  }
  const emptiedUrl = bundle?.photos[0]?.emptiedUrl ?? null;

  return (
    <>
      <TopAppBar title="10 · Génération" />
      <FlowShell bottomPadding="none">
        <RenderKickoff projectId={id} />
        <PreparationScreen
          projectId={id}
          originalUrl={emptiedUrl}
          title="Votre rendu est en cours de création…"
          description="Nos modèles intègrent vos produits à la pièce vidée, en respectant la perspective, la lumière et votre palette."
          targetKind="render"
          redirectTo={`/projets/${id}/rendu`}
        />
      </FlowShell>
    </>
  );
}
