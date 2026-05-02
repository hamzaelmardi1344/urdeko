import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminForbiddenError, requireAdmin } from "@/lib/admin/auth";
import {
  parseManualProductInput,
  uploadManualProductImage,
} from "@/lib/admin/product-manual";
import { createManualProduct } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const duplicateFrom = formData.get("duplicateFrom");
    const image = await uploadManualProductImage(formData, {
      duplicateFrom: typeof duplicateFrom === "string" ? duplicateFrom : null,
    });
    const input = parseManualProductInput(formData, image);
    const product = await createManualProduct(input);
    revalidatePath("/admin/produits");
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return productErrorResponse(err);
  }
}

function productErrorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "invalid_payload", issues: err.issues },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: "manual_product_failed", message: (err as Error).message },
    { status: 400 },
  );
}
