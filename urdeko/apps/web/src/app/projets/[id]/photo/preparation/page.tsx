import { redirect } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { PreparationScreen } from "@/components/flow/PreparationScreen";
import { getAccessibleProjectBundle } from "@/lib/projects";

export const metadata = { title: "Préparation de l'espace" };

export default async function PhotoPreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAccessibleProjectBundle(id);
  const photo = bundle?.photos[0];
  const originalUrl = photo?.originalUrl ?? null;

  if (!photo) {
    redirect(`/projets/${id}/photo/guide`);
  }

  // Le job empty_room est déjà terminé (ex. retour arrière, refresh après
  // completion) : on saute l'étape de polling et on va directement à /pret.
  if (photo?.emptiedUrl) {
    redirect(`/projets/${id}/photo/pret`);
  }

  return (
    <>
      <TopAppBar title="03 · Photo" />
      <FlowShell bottomPadding="none">
        <PreparationScreen
          projectId={id}
          originalUrl={originalUrl}
          title="Notre IA prépare votre pièce…"
          description="Nous détectons les éléments existants et libérons l'espace pour accueillir votre future sélection."
          targetKind="empty_room"
          redirectTo={`/projets/${id}/photo/pret`}
        />
      </FlowShell>
    </>
  );
}
