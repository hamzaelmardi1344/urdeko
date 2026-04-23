import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { contacts, projectRenders, projects } from "../db/schema";
import { sendEmail } from "./send";
import { RenderReady } from "./templates/RenderReady";
import { env } from "@/env";

export async function notifyRenderReady(projectId: string): Promise<void> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return;
  const [contact] = await db.select().from(contacts).where(eq(contacts.projectId, projectId)).limit(1);
  if (!contact || !contact.wantsEmail) return;

  const [render] = await db
    .select()
    .from(projectRenders)
    .where(eq(projectRenders.projectId, projectId))
    .orderBy(projectRenders.createdAt)
    .limit(1);
  if (!render) return;

  await sendEmail({
    to: contact.email,
    subject: `Votre rendu UrdeKo "${project.name}" est prêt`,
    react: RenderReady({
      firstName: contact.fullName.split(" ")[0] ?? contact.fullName,
      projectName: project.name,
      renderUrl: render.imageUrl,
      dashboardUrl: `${env.AUTH_URL}/projets/${project.id}/rendu`,
      advice: render.advice ?? undefined,
    }),
  });
}
