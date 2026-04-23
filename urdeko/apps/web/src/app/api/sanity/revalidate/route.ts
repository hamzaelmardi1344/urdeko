import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { env } from "@/env";

export async function POST(request: Request) {
  const signature = request.headers.get("x-urdeko-secret");
  if (signature !== env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json().catch(() => null)) as {
    _type?: string;
    category?: string;
  } | null;

  if (payload?._type === "product") {
    revalidateTag("products");
    if (payload.category) {
      revalidateTag(`products:${payload.category}`);
    }
  }
  return NextResponse.json({ revalidated: true });
}
