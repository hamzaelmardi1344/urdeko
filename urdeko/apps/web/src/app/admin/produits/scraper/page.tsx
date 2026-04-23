import { AdminShell } from "@/components/admin/AdminShell";
import { ScraperWorkbench } from "@/components/admin/ScraperWorkbench";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Scraper universel" };

export default async function ScraperPage() {
  const { email } = await requireAdmin();

  return (
    <AdminShell
      userEmail={email}
      title="Importer depuis le web"
      subtitle="Scraper universel — n'importe quelle boutique en 3 clics"
    >
      <ScraperWorkbench />
    </AdminShell>
  );
}
