import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db/client";
import {
  contacts,
  jobs,
  projectElements,
  projectPhotos,
  projectRenders,
  projectSelections,
  projects,
  type Project,
} from "./db/schema";
import { getGuestId, getOrCreateGuestId } from "./guest";
import { auth } from "./auth";
import { DEFAULT_BUDGET_MAD, DEFAULT_FLEXIBILITY } from "./domain";

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé à ce projet") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type ProjectClaimErrorCode =
  | "missing_session"
  | "missing_guest"
  | "project_not_found"
  | "already_owned"
  | "guest_mismatch"
  | "missing_contact"
  | "email_mismatch";

export class ProjectClaimError extends Error {
  constructor(
    public readonly code: ProjectClaimErrorCode,
    message = "Impossible de rattacher ce projet au compte",
  ) {
    super(message);
    this.name = "ProjectClaimError";
  }
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export async function resolveOwnership() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const guestId = userId ? null : await getOrCreateGuestId();
  return { userId, guestId };
}

export async function createProject(input: {
  name: string;
  budgetMad?: number;
  flexibility?: number;
}): Promise<Project> {
  const { userId, guestId } = await resolveOwnership();
  const [row] = await db
    .insert(projects)
    .values({
      name: input.name,
      budgetMad: input.budgetMad ?? DEFAULT_BUDGET_MAD,
      flexibility: input.flexibility ?? DEFAULT_FLEXIBILITY,
      userId: userId ?? null,
      guestId: guestId ?? null,
    })
    .returning();
  if (!row) throw new Error("Unable to create project");
  return row;
}

export async function getProject(id: string): Promise<Project | null> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

export async function getProjectOrThrow(id: string): Promise<Project> {
  const row = await getProject(id);
  if (!row) throw new Error(`Project ${id} not found`);
  return row;
}

/**
 * Vérifie que l'identité courante (user OU invité) est propriétaire du projet.
 * Retourne le projet si OK, sinon lève `ForbiddenError`. Les projets sans
 * propriétaire (legacy) sont traités comme privés.
 */
export async function assertProjectAccess(id: string): Promise<Project> {
  const row = await getProject(id);
  if (!row) throw new ForbiddenError("Projet introuvable");
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const guestId = await getGuestId();

  if (row.userId) {
    if (userId && row.userId === userId) return row;
    throw new ForbiddenError();
  }
  if (row.guestId) {
    if (guestId && row.guestId === guestId) return row;
    throw new ForbiddenError();
  }
  // Projet orphelin (ni user ni guest) : on refuse par défaut en prod.
  throw new ForbiddenError();
}

export async function hasProjectAccess(id: string): Promise<boolean> {
  try {
    await assertProjectAccess(id);
    return true;
  } catch {
    return false;
  }
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  if (!row) throw new Error(`Project ${id} not found`);
  return row;
}

export async function listMyProjects(): Promise<Project[]> {
  const { userId, guestId } = await resolveOwnership();
  if (userId) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }
  if (guestId) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.guestId, guestId))
      .orderBy(desc(projects.createdAt));
  }
  return [];
}

export async function getProjectBundle(id: string) {
  const [project, photos, elements, selections, renders, contact, jobRows] = await Promise.all([
    getProject(id),
    db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)),
    db.select().from(projectElements).where(eq(projectElements.projectId, id)),
    db.select().from(projectSelections).where(eq(projectSelections.projectId, id)),
    db
      .select()
      .from(projectRenders)
      .where(eq(projectRenders.projectId, id))
      .orderBy(desc(projectRenders.createdAt)),
    db.select().from(contacts).where(eq(contacts.projectId, id)).limit(1),
    db.select().from(jobs).where(eq(jobs.projectId, id)).orderBy(desc(jobs.createdAt)),
  ]);

  if (!project) return null;
  return {
    project,
    photos,
    elements: elements.map((row) => row.category),
    selections,
    renders,
    contact: contact[0] ?? null,
    jobs: jobRows,
    totalMad: selections.reduce((acc, sel) => acc + sel.priceMad, 0),
  };
}

export type ProjectBundle = NonNullable<Awaited<ReturnType<typeof getProjectBundle>>>;

export async function getAccessibleProjectBundle(id: string): Promise<ProjectBundle | null> {
  try {
    await assertProjectAccess(id);
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
  return getProjectBundle(id);
}

export async function getClaimableGuestProjectBundle(
  id: string,
): Promise<ProjectBundle | null> {
  const [session, guestId, bundle] = await Promise.all([
    auth(),
    getGuestId(),
    getProjectBundle(id),
  ]);
  if (!bundle) return null;

  const userId = session?.user?.id ?? null;
  if (bundle.project.userId) {
    return userId && bundle.project.userId === userId ? bundle : null;
  }
  if (bundle.project.guestId) {
    return guestId && bundle.project.guestId === guestId ? bundle : null;
  }
  return null;
}

export async function claimGuestProjectsForCurrentUser(projectId: string) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const email = normalizeEmail(session?.user?.email);
  if (!userId || !email) {
    throw new ProjectClaimError("missing_session");
  }

  const project = await getProject(projectId);
  if (!project) {
    throw new ProjectClaimError("project_not_found");
  }
  if (project.userId) {
    if (project.userId === userId) return { claimed: 0, alreadyOwned: true };
    throw new ProjectClaimError("already_owned");
  }

  const guestId = await getGuestId();
  if (!guestId) {
    throw new ProjectClaimError("missing_guest");
  }
  if (!project.guestId || project.guestId !== guestId) {
    throw new ProjectClaimError("guest_mismatch");
  }

  const [contact] = await db
    .select({ email: contacts.email })
    .from(contacts)
    .where(eq(contacts.projectId, projectId))
    .limit(1);
  if (!contact?.email) {
    throw new ProjectClaimError("missing_contact");
  }
  if (normalizeEmail(contact.email) !== email) {
    throw new ProjectClaimError("email_mismatch");
  }

  const claimed = await db
    .update(projects)
    .set({ userId, guestId: null, updatedAt: new Date() })
    .where(and(eq(projects.guestId, guestId), isNull(projects.userId)))
    .returning({ id: projects.id });

  return { claimed: claimed.length, alreadyOwned: false };
}

export async function setElements(projectId: string, categories: string[]): Promise<void> {
  await db.delete(projectElements).where(eq(projectElements.projectId, projectId));
  if (!categories.length) return;
  await db.insert(projectElements).values(
    categories.map((category) => ({
      projectId,
      category: category as Parameters<typeof db.insert>[0] extends never ? never : any, // typed via enum at runtime
    })),
  );
}

export async function replaceSelection(
  projectId: string,
  category: string,
  productId: string,
  priceMad: number,
): Promise<void> {
  await db
    .delete(projectSelections)
    .where(
      and(
        eq(projectSelections.projectId, projectId),
        eq(projectSelections.category, category as any),
      ),
    );
  await db.insert(projectSelections).values({
    projectId,
    category: category as any,
    productId,
    priceMad,
  });
}
