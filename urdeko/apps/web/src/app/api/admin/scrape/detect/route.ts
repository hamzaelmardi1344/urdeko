import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/auth";
import { detectAndExtract } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const payloadSchema = z.object({
  url: z.string().url(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin({ redirectOnFail: false });
  } catch (err) {
    if (err instanceof AdminForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await detectAndExtract(parsed.data.url);
  return NextResponse.json(result);
}
