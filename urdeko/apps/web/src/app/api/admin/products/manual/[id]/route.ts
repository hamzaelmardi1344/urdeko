import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminForbiddenError, requireAdmin } from "@/lib/admin/auth";
import {
  parseManualProductInput,
  uploadManualProductImage,
} from "@/lib/admin/product-manual";
import { updateManualProduct } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin({ redirectOnFail: false });
  } catch (err) {
    if (err instanceof AdminForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw err;
  }

  try {
    const { id } = await params;
    const formData = await req.formData();
    const image = await uploadManualProductImage(formData);
    const input = parseManualProductInput(formData, image);
    const product = await updateManualProduct(id, input);
    revalidatePath("/admin/produits");
    revalidatePath(`/admin/produits/${id}/modifier`);
    return NextResponse.json({ product });
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
