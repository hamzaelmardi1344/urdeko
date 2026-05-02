import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminForbiddenError, requireAdmin } from "@/lib/admin/auth";
import { readManualProductImageForAi } from "@/lib/admin/product-manual";
import { normalizeProductList } from "@/lib/admin/products";
import { ELEMENT_CATEGORIES, STYLES } from "@/lib/domain";
import { suggestProductMetadata } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const payloadSchema = z.object({
  name: z.string().trim().min(1).max(300),
  brand: z.string().trim().min(1).max(100),
});

const categories = new Set<string>(ELEMENT_CATEGORIES.map((category) => category.id));
const styles = new Set<string>(STYLES.map((style) => style.id));

export async function POST(req: Request) {
  try {
    await requireAdmin({ redirectOnFail: false });
  } catch (err) {
    if (err instanceof AdminForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw err;
  }

  try {
    const formData = await req.formData();
    const parsed = payloadSchema.parse({
      name: formData.get("name"),
      brand: formData.get("brand"),
    });
    const image = await readManualProductImageForAi(formData);
    const suggestion = await suggestProductMetadata({ ...parsed, image });

    return NextResponse.json({
      suggestion: {
        category:
          suggestion.category && categories.has(suggestion.category)
            ? suggestion.category
            : null,
        styles: suggestion.styles.filter((style) => styles.has(style)),
        tags: normalizeProductList(suggestion.tags),
        description: suggestion.description.trim().slice(0, 1000),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_payload", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "prefill_failed", message: (err as Error).message },
      { status: 400 },
    );
  }
}
