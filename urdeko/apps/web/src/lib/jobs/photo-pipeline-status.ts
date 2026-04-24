import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, type Job } from "@/lib/db/schema";

/** Réponse GET jobs alignée sur JobState + étape pour StepIndicator. */
export type PhotoEmptyPipelineState = {
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  error: string | null;
  stepIndex: number;
};

async function latestJob(projectId: string, kind: string): Promise<Job | null> {
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.projectId, projectId), eq(jobs.kind, kind)))
    .orderBy(desc(jobs.createdAt))
    .limit(1);
  return row ?? null;
}

function stepWhileEmptyRunning(progress: number): number {
  if (progress < 38) return 1;
  if (progress < 82) return 2;
  return 3;
}

/**
 * Agrège analyze_photo + empty_room pour l'écran /photo/preparation.
 * Sans ça, on ne pollait que empty_room (souvent « queued » pendant l'analyse)
 * et l'UI restait figée à ~8 %.
 */
export async function getPhotoEmptyRoomPipelineStatus(
  projectId: string,
): Promise<PhotoEmptyPipelineState> {
  const A = await latestJob(projectId, "analyze_photo");
  const E = await latestJob(projectId, "empty_room");

  if (E?.status === "succeeded") {
    return { status: "succeeded", progress: 100, error: null, stepIndex: 3 };
  }

  if (E?.status === "failed") {
    return {
      status: "failed",
      progress: Math.max(10, E.progress),
      error: E.error ?? "Une erreur est survenue.",
      stepIndex: stepWhileEmptyRunning(E.progress),
    };
  }

  if (E?.status === "running") {
    const p = Math.min(100, Math.max(0, E.progress));
    const progress = Math.min(99, Math.round(26 + (p / 100) * 71));
    return {
      status: "running",
      progress,
      error: null,
      stepIndex: stepWhileEmptyRunning(E.progress),
    };
  }

  // Pas encore de job empty_room, ou encore en file — on s'appuie sur analyze_photo
  if (A?.status === "failed") {
    return {
      status: "failed",
      progress: Math.max(5, A.progress),
      error: A.error ?? "Analyse impossible.",
      stepIndex: 0,
    };
  }

  if (A?.status === "running") {
    const ap = Math.min(100, Math.max(0, A.progress));
    const progress = Math.max(2, Math.min(24, Math.round(2 + (ap / 100) * 22)));
    return { status: "running", progress, error: null, stepIndex: 0 };
  }

  if (A?.status === "succeeded") {
    // Analyse terminée, job empty_room en attente de dispatch / démarrage
    return { status: "running", progress: 26, error: null, stepIndex: 1 };
  }

  // analyze_photo en file ou pas encore créé
  const ap = A ? Math.min(100, Math.max(0, A.progress)) : 0;
  const progress = A ? Math.max(1, Math.round(1 + (ap / 100) * 6)) : 1;
  return { status: "queued", progress, error: null, stepIndex: 0 };
}
