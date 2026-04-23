import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contacts,
  jobs,
  projectPhotos,
  projectRenders,
  projects,
  users,
} from "@/lib/db/schema";

// =====================================================================
// Lectures admin : projets, users, jobs. Toutes paginées côté DB.
// =====================================================================

export type AdminProjectRow = {
  id: string;
  name: string;
  status: string;
  roomType: string | null;
  style: string | null;
  budgetMad: number;
  createdAt: Date;
  updatedAt: Date;
  userEmail: string | null;
  userName: string | null;
  hasPhoto: boolean;
  hasEmptied: boolean;
  hasRender: boolean;
  hasContact: boolean;
};

export async function listAdminProjects({
  page = 0,
  pageSize = 30,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string | null;
}): Promise<{ items: AdminProjectRow[]; total: number }> {
  const conds: SQL[] = [];
  if (status) conds.push(eq(projects.status, status as never));
  // search = nom projet OU email user
  // (filtrage par email côté JS plus bas pour simplifier l'ilike join)

  const whereClause: SQL | undefined = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      roomType: projects.roomType,
      style: projects.style,
      budgetMad: projects.budgetMad,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      userEmail: users.email,
      userName: users.name,
      hasPhotoOriginal: sql<boolean>`EXISTS (SELECT 1 FROM ${projectPhotos} WHERE ${projectPhotos.projectId} = ${projects.id})`,
      hasPhotoEmptied: sql<boolean>`EXISTS (SELECT 1 FROM ${projectPhotos} WHERE ${projectPhotos.projectId} = ${projects.id} AND ${projectPhotos.emptiedUrl} IS NOT NULL)`,
      hasRender: sql<boolean>`EXISTS (SELECT 1 FROM ${projectRenders} WHERE ${projectRenders.projectId} = ${projects.id})`,
      hasContact: sql<boolean>`EXISTS (SELECT 1 FROM ${contacts} WHERE ${contacts.projectId} = ${projects.id})`,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(whereClause)
    .orderBy(desc(projects.updatedAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const countRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(whereClause);
  const n = countRows[0]?.n ?? 0;

  let items: AdminProjectRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    roomType: r.roomType,
    style: r.style,
    budgetMad: r.budgetMad,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    userEmail: r.userEmail,
    userName: r.userName,
    hasPhoto: Boolean(r.hasPhotoOriginal),
    hasEmptied: Boolean(r.hasPhotoEmptied),
    hasRender: Boolean(r.hasRender),
    hasContact: Boolean(r.hasContact),
  }));

  // search côté JS sur name || userEmail (simple)
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.userEmail?.toLowerCase().includes(q) ?? false),
    );
  }

  return { items, total: n };
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  projectCount: number;
  lastActivityAt: Date | null;
};

export async function listAdminUsers({
  page = 0,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
      projectCount: sql<number>`(SELECT count(*)::int FROM ${projects} WHERE ${projects.userId} = ${users.id})`,
      lastActivityAt: sql<Date | null>`(SELECT max(${projects.updatedAt}) FROM ${projects} WHERE ${projects.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const countRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users);
  const n = countRows[0]?.n ?? 0;

  return { items: rows, total: n };
}

export type AdminJobRow = {
  id: string;
  projectId: string;
  projectName: string | null;
  userEmail: string | null;
  kind: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
};

export async function listAdminJobs({
  page = 0,
  pageSize = 50,
  status,
  kind,
}: {
  page?: number;
  pageSize?: number;
  status?: string | null;
  kind?: string | null;
}): Promise<{ items: AdminJobRow[]; total: number }> {
  const conds: SQL[] = [];
  if (status) conds.push(eq(jobs.status, status as never));
  if (kind) conds.push(eq(jobs.kind, kind));
  const whereClause: SQL | undefined = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: jobs.id,
      projectId: jobs.projectId,
      projectName: projects.name,
      userEmail: users.email,
      kind: jobs.kind,
      status: jobs.status,
      progress: jobs.progress,
      error: jobs.error,
      createdAt: jobs.createdAt,
      startedAt: jobs.startedAt,
      finishedAt: jobs.finishedAt,
    })
    .from(jobs)
    .leftJoin(projects, eq(jobs.projectId, projects.id))
    .leftJoin(users, eq(projects.userId, users.id))
    .where(whereClause)
    .orderBy(desc(jobs.createdAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const countRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(whereClause);
  const n = countRows[0]?.n ?? 0;

  const items = rows.map((r) => ({
    ...r,
    durationMs:
      r.startedAt && r.finishedAt
        ? r.finishedAt.getTime() - r.startedAt.getTime()
        : null,
  }));

  return { items, total: n };
}

export async function getAdminProjectDetail(id: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      roomType: projects.roomType,
      style: projects.style,
      palette: projects.palette,
      budgetMad: projects.budgetMad,
      flexibility: projects.flexibility,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      userId: projects.userId,
      guestId: projects.guestId,
      userEmail: users.email,
      userName: users.name,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) return null;

  const [photos, contact, renders, projectJobs] = await Promise.all([
    db
      .select()
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, id))
      .orderBy(desc(projectPhotos.createdAt)),
    db.select().from(contacts).where(eq(contacts.projectId, id)).limit(1),
    db
      .select()
      .from(projectRenders)
      .where(eq(projectRenders.projectId, id))
      .orderBy(desc(projectRenders.createdAt)),
    db
      .select()
      .from(jobs)
      .where(eq(jobs.projectId, id))
      .orderBy(desc(jobs.createdAt)),
  ]);

  return { project, photos, contact: contact[0] ?? null, renders, jobs: projectJobs };
}
