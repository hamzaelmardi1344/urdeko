import { db } from "../db/client";
import { jobs } from "../db/schema";
import { env } from "@/env";

// =====================================================================
// Mini file de jobs sans broker externe (remplace Inngest).
//
// Pourquoi ce design :
//   1. On insère le job en DB (status=queued) — c'est la source de vérité,
//      utilisée par /api/projects/[id]/jobs pour le polling client.
//   2. On lance un fetch fire-and-forget vers /api/jobs/run avec le jobId.
//      L'init de la requête HTTP est synchrone (la connexion TCP s'ouvre
//      avant que la function caller termine), donc Vercel ne kill pas
//      l'appel sortant même si la server action retourne immédiatement.
//   3. Le route handler /api/jobs/run a maxDuration:300 (Pro) et exécute
//      le job synchroniquement.
//   4. Authentifié via INTERNAL_JOB_SECRET pour qu'on ne puisse pas le
//      déclencher depuis l'extérieur.
// =====================================================================

export type JobKind = "analyze_photo" | "empty_room" | "render";

export type JobPayload = {
  analyze_photo: { projectId: string; photoId: string; originalUrl: string };
  empty_room: { projectId: string; photoId: string; originalUrl: string };
  render: { projectId: string };
};

export async function enqueueJob<K extends JobKind>(input: {
  projectId: string;
  kind: K;
  payload: JobPayload[K];
}): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({
      projectId: input.projectId,
      kind: input.kind,
      status: "queued",
      progress: 0,
      resultJson: { payload: input.payload },
    })
    .returning({ id: jobs.id });
  if (!row) throw new Error("enqueue failed");

  const url = `${env.AUTH_URL.replace(/\/$/, "")}/api/jobs/run`;
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": env.INTERNAL_JOB_SECRET,
    },
    body: JSON.stringify({ jobId: row.id }),
    cache: "no-store",
    keepalive: true,
  }).catch((e) => {
    console.error("[jobs] dispatch fetch failed", e);
  });

  return row.id;
}
