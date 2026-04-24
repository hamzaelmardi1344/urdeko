"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, projectPhotos, projects } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { requireAdmin } from "./auth";

// =====================================================================
// Server actions admin : retry jobs, annuler un projet, etc.
// Toutes protégées par requireAdmin().
// =====================================================================

export async function adminRetryJobAction(formData: FormData) {
  await requireAdmin();
  const jobId = formData.get("jobId");
  if (typeof jobId !== "string") throw new Error("jobId manquant");

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job introuvable");

  const [photo] = await db
    .select()
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, job.projectId))
    .orderBy(projectPhotos.createdAt)
    .limit(1);

  switch (job.kind) {
    case "analyze_photo": {
      if (!photo) throw new Error("Aucune photo à retraiter");
      await enqueueJob({
        projectId: job.projectId,
        kind: "analyze_photo",
        payload: {
          projectId: job.projectId,
          photoId: photo.id,
          originalUrl: photo.originalUrl,
        },
      });
      break;
    }
    case "empty_room": {
      if (!photo) throw new Error("Aucune photo à retraiter");
      await db
        .update(projectPhotos)
        .set({ emptiedUrl: null })
        .where(eq(projectPhotos.id, photo.id));
      await enqueueJob({
        projectId: job.projectId,
        kind: "empty_room",
        payload: {
          projectId: job.projectId,
          photoId: photo.id,
          originalUrl: photo.originalUrl,
        },
      });
      break;
    }
    case "render": {
      await enqueueJob({
        projectId: job.projectId,
        kind: "render",
        payload: { projectId: job.projectId },
      });
      break;
    }
    default:
      throw new Error(`Retry non supporté pour kind=${job.kind}`);
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/projets/${job.projectId}`);
}

export async function adminDeleteProjectAction(formData: FormData) {
  await requireAdmin();
  const projectId = formData.get("projectId");
  if (typeof projectId !== "string") throw new Error("projectId manquant");

  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/admin/projets");
  revalidatePath("/admin");
}
