import { NextResponse } from "next/server";
import { retryEmptyRoomForProject } from "@/lib/retry-empty-room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await retryEmptyRoomForProject(id);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ redirectTo: r.redirectTo });
}
