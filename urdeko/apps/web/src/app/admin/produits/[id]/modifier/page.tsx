import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ManualProductForm } from "@/components/admin/ManualProductForm";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminProduct } from "@/lib/admin/products";

export const metadata = { title: "Modifier un produit" };
export const dynamic = "force-dynamic";

export default async function EditManualProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { email } = await requireAdmin();
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();

  return (
    <AdminShell
      userEmail={email}
      title="Modifier un produit"
      subtitle={`${product.brand} · ${product.name}`}
    >
      <ManualProductForm mode="edit" initial={product} />
    </AdminShell>
  );
}
