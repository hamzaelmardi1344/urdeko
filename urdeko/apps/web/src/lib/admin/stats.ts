import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contacts,
  jobs,
  products,
  projectPhotos,
  projectRenders,
  projectSelections,
  projects,
  users,
} from "@/lib/db/schema";

export type DashboardStats = {
  projects: { total: number; last7d: number };
  users: { total: number; last7d: number };
  jobs: { total: number; running: number; failed24h: number };
  photos: { total: number; emptied: number };
  renders: { total: number };
  contacts: { total: number };
  products: { total: number };
  recentErrors: Array<{ id: string; kind: string; error: string | null; createdAt: Date; projectId: string }>;
  jobKinds: Array<{ kind: string; total: number; succeeded: number; failed: number }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d1 = new Date(now - 24 * 60 * 60 * 1000);

  const [
    [projectsTotal],
    [projectsLast7d],
    [usersTotal],
    [usersLast7d],
    [jobsTotal],
    [jobsRunning],
    [jobsFailed24h],
    [photosTotal],
    [photosEmptied],
    [rendersTotal],
    [contactsTotal],
    jobKinds,
    recentErrors,
    productsTotal,
  ] = await Promise.all([
    db.select({ n: count() }).from(projects),
    db.select({ n: count() }).from(projects).where(gte(projects.createdAt, d7)),
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(gte(users.createdAt, d7)),
    db.select({ n: count() }).from(jobs),
    db.select({ n: count() }).from(jobs).where(eq(jobs.status, "running")),
    db
      .select({ n: count() })
      .from(jobs)
      .where(and(eq(jobs.status, "failed"), gte(jobs.createdAt, d1))),
    db.select({ n: count() }).from(projectPhotos),
    db
      .select({ n: count() })
      .from(projectPhotos)
      .where(sql`${projectPhotos.emptiedUrl} is not null`),
    db.select({ n: count() }).from(projectRenders),
    db.select({ n: count() }).from(contacts),
    db
      .select({
        kind: jobs.kind,
        total: count(),
        succeeded: sql<number>`sum(case when ${jobs.status} = 'succeeded' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${jobs.status} = 'failed' then 1 else 0 end)`,
      })
      .from(jobs)
      .groupBy(jobs.kind)
      .orderBy(desc(count())),
    db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        error: jobs.error,
        createdAt: jobs.createdAt,
        projectId: jobs.projectId,
      })
      .from(jobs)
      .where(eq(jobs.status, "failed"))
      .orderBy(desc(jobs.createdAt))
      .limit(5),
    db.select({ n: count() }).from(products),
  ]);

  const n = (row: { n: number } | undefined) => row?.n ?? 0;

  return {
    projects: { total: n(projectsTotal), last7d: n(projectsLast7d) },
    users: { total: n(usersTotal), last7d: n(usersLast7d) },
    jobs: { total: n(jobsTotal), running: n(jobsRunning), failed24h: n(jobsFailed24h) },
    photos: { total: n(photosTotal), emptied: n(photosEmptied) },
    renders: { total: n(rendersTotal) },
    contacts: { total: n(contactsTotal) },
    products: { total: productsTotal[0]?.n ?? 0 },
    recentErrors,
    jobKinds: jobKinds.map((j) => ({
      kind: j.kind,
      total: j.total,
      succeeded: Number(j.succeeded) || 0,
      failed: Number(j.failed) || 0,
    })),
  };
}

export async function getRecentProjects(limit = 8) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      style: projects.style,
      budgetMad: projects.budgetMad,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}

export async function getSelectionsCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(projectSelections);
  return row?.n ?? 0;
}
