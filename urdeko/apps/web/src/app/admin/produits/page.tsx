import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductList } from "@/components/admin/ProductList";
import { listAdminProducts } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Produits" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { email } = await requireAdmin();
  const sp = await searchParams;
  const category = sp.category ?? "";
  const search = sp.search ?? "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const { items, total } = await listAdminProducts({
    category: category || null,
    search: search || null,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <AdminShell
      userEmail={email}
      title="Catalogue produits"
      subtitle={`${total.toLocaleString("fr-MA")} produits dans Sanity`}
      action={
        <Link
          href="/admin/produits/scraper"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary shadow-glow-sm"
        >
          + Importer depuis le web
        </Link>
      }
    >
      <ProductList
        items={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        category={category}
        search={search}
      />
    </AdminShell>
  );
}
