import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/auth";
import { deleteProducts } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export async function POST(req: Request) {
  try {
    await requireAdmin({ redirectOnFail: false });
  } catch (err) {
    if (err instanceof AdminForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await deleteProducts(parsed.data.ids);
  revalidateTag("products");
  return NextResponse.json(result);
}
