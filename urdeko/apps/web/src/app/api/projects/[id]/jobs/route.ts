import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { ForbiddenError, assertProjectAccess } from "@/lib/projects";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await assertProjectAccess(id);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const where = kind
    ? and(eq(jobs.projectId, id), eq(jobs.kind, kind))
    : eq(jobs.projectId, id);
  const [row] = await db
    .select()
    .from(jobs)
    .where(where)
    .orderBy(desc(jobs.createdAt))
    .limit(1);
  if (!row) {
    return NextResponse.json({ status: "queued", progress: 0, error: null });
  }
  return NextResponse.json({
    status: row.status,
    progress: row.progress,
    error: row.error,
  });
}
