import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  jobs,
  projectPhotos,
  projectRenders,
  projectSelections,
  projects,
} from "../db/schema";
import { analyzePhoto, emptyRoom, renderFinal, writeAdvice } from "../ai/gemini";
import { uploadObject } from "../storage";
import { getProduct } from "../catalogue";
import { notifyRenderReady } from "../email/notifyRenderReady";
import { inngest } from "./client";

// =====================================================================
// Inngest functions : les jobs longs sont déclenchés via inngest.send()
// depuis les route handlers puis suivis via la table `jobs`.
// =====================================================================

export const analyzePhotoJob = inngest.createFunction(
  { id: "analyze-photo", retries: 2 },
  { event: "urdeko/photo.uploaded" },
  async ({ event, step }) => {
    const { projectId, photoId, originalUrl } = event.data as {
      projectId: string;
      photoId: string;
      originalUrl: string;
    };

    const jobId = await step.run("create-job", () => createJob(projectId, "analyze_photo"));

    // On ne laisse jamais une analyse ratée bloquer tout le pipeline :
    // - si Gemini retourne un JSON invalide ou lève, on enregistre une
    //   analyse par défaut "valide" pour continuer vers empty_room ;
    // - la validation reste purement informative (conseils d'UX).
    await step.run("analyze", async () => {
      let analysis;
      try {
        analysis = await analyzePhoto(originalUrl);
      } catch (error) {
        console.error("[analyze-photo] fallback: analyse Gemini échouée", error);
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
      await db
        .update(projectPhotos)
        .set({ analysisJson: analysis })
        .where(eq(projectPhotos.id, photoId));
      await completeJob(jobId, analysis);
      await db
        .update(projects)
        .set({ status: "photo_ok" })
        .where(eq(projects.id, projectId));
    });

    // Toujours déclencher l'étape suivante — même si Gemini a marqué la
    // photo "invalide", on laisse l'utilisateur voir le rendu empty_room :
    // l'UI affichera les conseils stockés dans analysisJson au besoin.
    await step.sendEvent("dispatch-empty-room", {
      name: "urdeko/room.empty.requested",
      data: { projectId, photoId, originalUrl },
    });
  },
);

export const emptyRoomJob = inngest.createFunction(
  { id: "empty-room", retries: 2, concurrency: 5 },
  { event: "urdeko/room.empty.requested" },
  async ({ event, step }) => {
    const { projectId, photoId, originalUrl } = event.data as {
      projectId: string;
      photoId: string;
      originalUrl: string;
    };
    const jobId = await step.run("create-job", () => createJob(projectId, "empty_room"));

    await step.run("generate", async () => {
      try {
        const { base64, mimeType } = await emptyRoom(originalUrl);
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
        await completeJob(jobId, { emptiedUrl: url });
      } catch (error) {
        await failJob(jobId, (error as Error).message);
        throw error;
      }
    });
  },
);

export const renderProjectJob = inngest.createFunction(
  { id: "render-project", retries: 1, concurrency: 3 },
  { event: "urdeko/project.render.requested" },
  async ({ event, step }) => {
    const { projectId } = event.data as { projectId: string };

    const jobId = await step.run("create-job", () => createJob(projectId, "render"));

    const context = await step.run("load-context", async () => {
      const bundle = await loadRenderContext(projectId);
      if (!bundle) throw new Error(`Project ${projectId} introuvable ou incomplet`);
      return bundle;
    });

    await step.run("render", async () => {
      try {
        const image = await renderFinal({
          emptiedUrl: context.emptiedUrl,
          productImages: context.productImages,
          style: context.style,
          palette: context.palette,
          roomType: context.roomType,
        });
        const uploaded = await uploadObject({
          buffer: Buffer.from(image.base64, "base64"),
          contentType: image.mimeType,
          keyPrefix: `projects/${projectId}/renders`,
          extension: image.mimeType === "image/png" ? ".png" : ".jpg",
        });
        const advice = await writeAdvice({
          style: context.style,
          palette: context.palette,
          products: context.productImages.map((p) => ({ category: p.category, name: p.name })),
        });
        await db.insert(projectRenders).values({
          projectId,
          imageUrl: uploaded.url,
          advice,
          version: context.nextVersion,
        });
        await db.update(projects).set({ status: "completed" }).where(eq(projects.id, projectId));
        await completeJob(jobId, { imageUrl: uploaded.url });
        await notifyRenderReady(projectId);
      } catch (error) {
        await db.update(projects).set({ status: "failed" }).where(eq(projects.id, projectId));
        await failJob(jobId, (error as Error).message);
        throw error;
      }
    });
  },
);

async function loadRenderContext(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
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

async function createJob(projectId: string, kind: string): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({ projectId, kind, status: "running", startedAt: new Date(), progress: 5 })
    .returning({ id: jobs.id });
  if (!row) throw new Error("Unable to create job");
  return row.id;
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

export const allFunctions = [analyzePhotoJob, emptyRoomJob, renderProjectJob];
