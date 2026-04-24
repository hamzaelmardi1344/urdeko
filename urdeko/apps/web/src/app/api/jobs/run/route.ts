import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { runJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({ jobId: z.string().uuid() });

export async function POST(req: Request) {
  if (req.headers.get("x-internal-secret") !== env.INTERNAL_JOB_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await runJob(parsed.data.jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[jobs/run] handler failed", error);
    return NextResponse.json(
      { error: "job_failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
