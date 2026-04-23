import { redirect } from "next/navigation";
import { getProjectBundle } from "@/lib/projects";

// Route pivot : redirige vers la prochaine etape manquante du projet.
export default async function ProjectIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
  if (!bundle) redirect(`/projets/${id}/espace`);
  const { project, photos, selections, renders } = bundle;

  if (!project.roomType) redirect(`/projets/${id}/espace`);
  if (!photos.length) redirect(`/projets/${id}/photo/guide`);
  if (!photos[0]?.emptiedUrl) redirect(`/projets/${id}/photo/preparation`);
  if (!project.style) redirect(`/projets/${id}/style`);
  if (!project.palette) redirect(`/projets/${id}/palette`);
  if (project.status === "photo_ok") redirect(`/projets/${id}/elements`);
  if (!selections.length) redirect(`/projets/${id}/produits/preparation`);
  if (!renders.length && project.status !== "rendering") {
    redirect(`/projets/${id}/recapitulatif`);
  }
  redirect(`/projets/${id}/rendu`);
}
