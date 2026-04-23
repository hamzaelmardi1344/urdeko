import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { PreparationScreen } from "@/components/flow/PreparationScreen";
import { RenderKickoff } from "@/components/flow/RenderKickoff";
import { getProjectBundle } from "@/lib/projects";

export const metadata = { title: "Génération du rendu" };

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
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
