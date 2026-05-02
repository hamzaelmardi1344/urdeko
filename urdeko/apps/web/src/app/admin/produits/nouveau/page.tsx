import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ManualProductForm } from "@/components/admin/ManualProductForm";
import { requireAdmin } from "@/lib/admin/auth";
import { duplicateSourceProduct } from "@/lib/admin/products";

export const metadata = { title: "Ajouter un produit" };
export const dynamic = "force-dynamic";

export default async function NewManualProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email } = await requireAdmin();
  const sp = await searchParams;
  const duplicateFrom = sp.dupliquer ?? sp.duplicate ?? null;
  const source = duplicateFrom ? await duplicateSourceProduct(duplicateFrom) : null;

  if (duplicateFrom && !source) notFound();

  const initial = source
    ? {
        name: source.name,
        brand: source.brand,
        category: source.category,
        priceMad: source.priceMad,
        imageUrl: source.imageUrl,
        sourceUrl: source.sourceUrl,
        styles: source.styles,
        tags: source.tags,
        description: source.description,
      }
    : null;

  return (
    <AdminShell
      userEmail={email}
      title={source ? "Dupliquer un produit" : "Ajouter un produit"}
      subtitle={
        source
          ? "Prérempli depuis un produit existant — l'ID final sera régénéré."
          : "Création manuelle avec upload image ou URL directe"
      }
    >
      <ManualProductForm
        mode={source ? "duplicate" : "create"}
        initial={initial}
        duplicateFrom={duplicateFrom}
      />
    </AdminShell>
  );
}
