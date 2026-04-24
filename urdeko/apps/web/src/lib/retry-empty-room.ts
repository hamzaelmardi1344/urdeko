import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projectPhotos } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { getGuestId } from "@/lib/guest";
import { assertProjectAccess, ForbiddenError } from "@/lib/projects";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

async function currentIdentity(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return `u:${session.user.id}`;
  const guest = await getGuestId();
  return `g:${guest ?? "anon"}`;
}

export type RetryEmptyRoomResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; status: 400 | 403 | 429 };

/**
 * Relance le job « pièce vide » sur la photo déjà uploadée.
 * Utilisé par la Server Action et par l'API POST (évite les IDs d'action
 * périmés après un restart Next.js).
 */
export async function retryEmptyRoomForProject(projectId: string): Promise<RetryEmptyRoomResult> {
  try {
    await assertProjectAccess(projectId);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { ok: false, error: "Accès refusé à ce projet.", status: 403 };
    }
    throw e;
  }

  const [photo] = await db
    .select()
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId))
    .limit(1);

  if (!photo) {
    return { ok: false, error: "Aucune photo à retraiter pour ce projet.", status: 400 };
  }

  const who = await currentIdentity();
  const limit = await rateLimit(who, RATE_LIMITS.aiGenerate);
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Quota IA atteint (20 analyses / heure). Réessaie un peu plus tard.",
      status: 429,
    };
  }

  await db
    .update(projectPhotos)
    .set({ emptiedUrl: null })
    .where(eq(projectPhotos.id, photo.id));

  await enqueueJob({
    projectId,
    kind: "empty_room",
    payload: { projectId, photoId: photo.id, originalUrl: photo.originalUrl },
  });

  revalidatePath(`/projets/${projectId}`, "layout");

  return { ok: true, redirectTo: `/projets/${projectId}/photo/preparation` };
}
