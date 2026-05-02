import Link from "next/link";
import { Icon } from "@urdeko/design-system";
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
      subtitle={`${total.toLocaleString("fr-MA")} produits dans le catalogue`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary shadow-glow-sm"
          >
            <Icon name="add" size={18} />
            Ajouter manuellement
          </Link>
          <Link
            href="/admin/produits/scraper"
            className="inline-flex items-center gap-2 rounded-full border border-outline/20 bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="travel_explore" size={18} />
            Importer depuis le web
          </Link>
        </div>
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
