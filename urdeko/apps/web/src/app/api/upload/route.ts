import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadObject } from "@/lib/storage";
import { rateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { getGuestId } from "@/lib/guest";
import { ForbiddenError, assertProjectAccess } from "@/lib/projects";

const schema = z.object({
  projectId: z.string().uuid(),
  purpose: z.enum(["photo_original", "avatar", "product"]).default("photo_original"),
});

export const runtime = "nodejs";

async function identify(request: Request): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return `u:${session.user.id}`;
  const guest = await getGuestId();
  if (guest) return `g:${guest}`;
  const forwarded =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `ip:${forwarded.split(",")[0]?.trim() ?? "unknown"}`;
}

export async function POST(request: Request) {
  const who = await identify(request);
  const limited = await rateLimit(who, RATE_LIMITS.upload);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop d'uploads, réessaie dans une minute." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    purpose: formData.get("purpose") ?? "photo_original",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertProjectAccess(parsed.data.projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Fichier image requis" }, { status: 415 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (>20 Mo)" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadObject({
    buffer,
    contentType: file.type || "image/jpeg",
    keyPrefix: `projects/${parsed.data.projectId}/${parsed.data.purpose}`,
  });

  return NextResponse.json(uploaded, { headers: rateLimitHeaders(limited) });
}
