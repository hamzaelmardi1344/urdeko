import { after } from "next/server";
import { db } from "../db/client";
import { jobs } from "../db/schema";
import { env } from "@/env";

// =====================================================================
// Mini file de jobs sans broker externe (remplace Inngest).
//
// Pourquoi ce design :
//   1. On insère le job en DB (status=queued) — source de vérité pour le
//      polling client (/api/projects/[id]/jobs).
//   2. On déclenche /api/jobs/run (POST) avec INTERNAL_JOB_SECRET pour
//      exécuter le job dans une invocation avec maxDuration:300.
//   3. Le dispatch est planifié via `after()` : sans ça, un fetch « fire and
//      forget » lancé depuis runJob() (chaînage analyze → empty_room) ou
//      depuis une Server Action est souvent **coupé** quand la fonction
//      serverless se termine — le job reste bloqué en « queued » à l’infini.
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

  const jobId = row.id;
  const url = `${env.AUTH_URL.replace(/\/$/, "")}/api/jobs/run`;

  after(async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": env.INTERNAL_JOB_SECRET,
        },
        body: JSON.stringify({ jobId }),
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[jobs] dispatch HTTP", res.status, text);
      }
    } catch (e) {
      console.error("[jobs] dispatch fetch failed", e);
    }
  });

  return jobId;
}
