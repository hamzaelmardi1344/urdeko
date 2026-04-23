import { notFound } from "next/navigation";
import { ForbiddenError, assertProjectAccess } from "@/lib/projects";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    await assertProjectAccess(id);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      // 404 plutôt que 403 : on ne divulgue pas l'existence du projet.
      notFound();
    }
    throw error;
  }
  return <>{children}</>;
}
