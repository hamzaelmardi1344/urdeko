"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/lib/db/client";
import { jobs, projectPhotos, projects, users } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { normalizeAdminEmail } from "./emails";
import { sendAdminMagicLink } from "./magic-link";
import { requireSuperAdmin } from "./auth";

// =====================================================================
// Server actions super admin : retry jobs, annuler un projet, inviter des partenaires.
// =====================================================================

export async function adminRetryJobAction(formData: FormData) {
  await requireSuperAdmin();
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
  await requireSuperAdmin();
  const projectId = formData.get("projectId");
  if (typeof projectId !== "string") throw new Error("projectId manquant");

  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/admin/projets");
  revalidatePath("/admin");
}

export async function invitePartnerAction(formData: FormData) {
  await requireSuperAdmin();
  const email = normalizeAdminEmail(formData.get("email"));
  if (!email) redirect("/admin/users?invite=invalid");

  await db
    .insert(users)
    .values({ email, role: "partner" })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: sql`case when ${users.role} = 'super_admin' then ${users.role} else 'partner' end`,
      },
    });

  let sent = true;
  try {
    await sendAdminMagicLink(email, requestOrigin(await headers()));
  } catch (error) {
    console.error("[admin/users] partner invite email failed", error);
    sent = false;
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?invite=${sent ? "sent" : "created"}&email=${encodeURIComponent(email)}`);
}

function requestOrigin(headersList: Headers): string {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (!host) return env.AUTH_URL.replace(/\/$/, "");
  const proto =
    headersList.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
