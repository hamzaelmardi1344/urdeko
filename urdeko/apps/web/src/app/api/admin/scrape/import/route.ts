import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/auth";
import { extractedProductSchema } from "@/lib/scraper/types";
import { upsertProducts } from "@/lib/scraper/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const payloadSchema = z.object({
  products: z.array(extractedProductSchema).min(1).max(24),
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

  const result = await upsertProducts(parsed.data.products);
  return NextResponse.json(result);
}
