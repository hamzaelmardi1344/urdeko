import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  jobs,
  projectPhotos,
  projectRenders,
  projectSelections,
  projects,
  type Job,
} from "../db/schema";
import { analyzePhoto, emptyRoom, renderFinal, writeAdvice } from "../ai/gemini";
import { uploadObject } from "../storage";
import { getProduct } from "../catalogue";
import { enqueueJob, type JobKind, type JobPayload } from "./dispatch";

// =====================================================================
// Exécution synchrone d'un job (remplace Inngest createFunction).
//
// Chaque handler :
//   - met à jour status -> running et startedAt
//   - exécute le travail (Gemini, S3, DB)
//   - en cas de succès, completeJob(); en cas d'erreur failJob() + throw
//   - peut chaîner sur un autre kind via enqueueJob() (cf. analyze -> empty)
//
// Appelé par /api/jobs/run (maxDuration:300 sur Vercel) après un dispatch
// fire-and-forget depuis une server action.
// =====================================================================

type JobPayloadOf<K extends JobKind> = JobPayload[K];

async function bumpJobProgress(jobId: string, progress: number): Promise<void> {
  await db.update(jobs).set({ progress }).where(eq(jobs.id, jobId));
}

function getPayload<K extends JobKind>(job: Job, _kind: K): JobPayloadOf<K> {
  const stored = (job.resultJson ?? {}) as { payload?: JobPayloadOf<K> };
  if (!stored.payload) {
    throw new Error(`Job ${job.id} missing payload`);
  }
  return stored.payload;
}

export async function runJob(jobId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) {
    console.warn(`[jobs] runJob: ${jobId} not found`);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") {
    console.info(`[jobs] runJob: ${jobId} already ${job.status}, skip`);
    return;
  }

  const [claimed] = await db
    .update(jobs)
    .set({
      status: "running",
      progress: 5,
      error: null,
      startedAt: new Date(),
      finishedAt: null,
    })
    .where(and(eq(jobs.id, jobId), inArray(jobs.status, ["queued", "failed"])))
    .returning();

  if (!claimed) {
    console.info(`[jobs] runJob: ${jobId} was claimed by another runner, skip`);
    return;
  }

  try {
    switch (claimed.kind as JobKind) {
      case "analyze_photo":
        await handleAnalyzePhoto(claimed);
        break;
      case "empty_room":
        await handleEmptyRoom(claimed);
        break;
      case "render":
        await handleRender(claimed);
        break;
      default:
        throw new Error(`Unknown job kind: ${claimed.kind}`);
    }
  } catch (error) {
    await failJob(jobId, (error as Error).message);
    throw error;
  }
}

async function handleAnalyzePhoto(job: Job): Promise<void> {
  const { projectId, photoId, originalUrl } = getPayload(job, "analyze_photo");

  // Fallback "valide" si Gemini hallucine ou échoue : on ne bloque pas
  // tout le pipeline, on passe à empty_room avec des conseils par défaut.
  let analysis;
  try {
    await bumpJobProgress(job.id, 22);
    analysis = await analyzePhoto(originalUrl);
  } catch (error) {
    console.error("[jobs:analyze_photo] fallback: analyse Gemini échouée", error);
    analysis = {
      valid: true,
      reasons: [],
      detected: {
        roomType: null,
        lighting: "moyenne" as const,
        framing: "correct" as const,
        clutter: "moyen" as const,
      },
      advice:
        "Analyse automatique indisponible pour cette photo. Nous continuons avec les réglages par défaut.",
    };
  }
  await bumpJobProgress(job.id, 58);

  await db
    .update(projectPhotos)
    .set({ analysisJson: analysis })
    .where(eq(projectPhotos.id, photoId));
  await bumpJobProgress(job.id, 78);
  await db
    .update(projects)
    .set({ status: "photo_ok" })
    .where(eq(projects.id, projectId));

  await bumpJobProgress(job.id, 94);
  await completeJob(job.id, analysis);

  await enqueueJob({
    projectId,
    kind: "empty_room",
    payload: { projectId, photoId, originalUrl },
  });
}

async function handleEmptyRoom(job: Job): Promise<void> {
  const { projectId, photoId, originalUrl } = getPayload(job, "empty_room");

  await bumpJobProgress(job.id, 18);
  const { base64, mimeType } = await emptyRoom(originalUrl);
  await bumpJobProgress(job.id, 78);
  const { url } = await uploadObject({
    buffer: Buffer.from(base64, "base64"),
    contentType: mimeType,
    keyPrefix: `projects/${projectId}/emptied`,
    extension: mimeType === "image/png" ? ".png" : ".jpg",
  });

  await db
    .update(projectPhotos)
    .set({ emptiedUrl: url })
    .where(eq(projectPhotos.id, photoId));

  await completeJob(job.id, { emptiedUrl: url });
}

async function handleRender(job: Job): Promise<void> {
  const { projectId } = getPayload(job, "render");

  const context = await loadRenderContext(projectId);
  if (!context) {
    throw new Error(`Project ${projectId} introuvable ou incomplet`);
  }

  try {
    await bumpJobProgress(job.id, 14);
    const image = await renderFinal({
      emptiedUrl: context.emptiedUrl,
      productImages: context.productImages,
      style: context.style,
      palette: context.palette,
      roomType: context.roomType,
    });
    await bumpJobProgress(job.id, 42);
    const uploaded = await uploadObject({
      buffer: Buffer.from(image.base64, "base64"),
      contentType: image.mimeType,
      keyPrefix: `projects/${projectId}/renders`,
      extension: image.mimeType === "image/png" ? ".png" : ".jpg",
    });
    await bumpJobProgress(job.id, 62);
    const advice = await writeAdvice({
      style: context.style,
      palette: context.palette,
      products: context.productImages.map((p) => ({ category: p.category, name: p.name })),
    });
    await bumpJobProgress(job.id, 84);
    await db.insert(projectRenders).values({
      projectId,
      imageUrl: uploaded.url,
      advice,
      version: context.nextVersion,
    });
    await db
      .update(projects)
      .set({ status: "completed" })
      .where(eq(projects.id, projectId));
    await completeJob(job.id, { imageUrl: uploaded.url });

    const { notifyRenderReady } = await import("../email/notifyRenderReady");
    await notifyRenderReady(projectId);
  } catch (error) {
    await db
      .update(projects)
      .set({ status: "failed" })
      .where(eq(projects.id, projectId));
    throw error;
  }
}

async function loadRenderContext(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || !project.style || !project.palette) return null;

  const photo = await db
    .select()
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId))
    .limit(1);
  if (!photo[0]?.emptiedUrl) return null;

  const selectionRows = await db
    .select()
    .from(projectSelections)
    .where(eq(projectSelections.projectId, projectId));
  if (!selectionRows.length) return null;

  const productImages = await Promise.all(
    selectionRows.map(async (row) => {
      const product = await getProduct(row.productId);
      if (!product) return null;
      return {
        category: row.category,
        name: product.name,
        url: product.imageUrl,
      };
    }),
  );

  const renders = await db
    .select({ version: projectRenders.version })
    .from(projectRenders)
    .where(eq(projectRenders.projectId, projectId));

  return {
    emptiedUrl: photo[0].emptiedUrl,
    style: project.style,
    palette: project.palette,
    roomType: project.roomType ?? "salon",
    productImages: productImages.filter((p): p is NonNullable<typeof p> => Boolean(p)),
    nextVersion: (Math.max(0, ...renders.map((r) => r.version)) || 0) + 1,
  };
}

async function completeJob(jobId: string, result: unknown): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: "succeeded",
      progress: 100,
      resultJson: result as never,
      finishedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

async function failJob(jobId: string, error: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: "failed", error, finishedAt: new Date() })
    .where(eq(jobs.id, jobId));
}
