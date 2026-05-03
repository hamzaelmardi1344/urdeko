import { AdminShell } from "@/components/admin/AdminShell";
import { ScraperWorkbench } from "@/components/admin/ScraperWorkbench";
import { requireBackoffice } from "@/lib/admin/auth";

export const metadata = { title: "Scraper universel" };

export default async function ScraperPage() {
  const { email, user } = await requireBackoffice();

  return (
    <AdminShell
      userEmail={email}
      role={user.role}
      title="Importer depuis le web"
      subtitle="Scraper universel — n'importe quelle boutique en 3 clics"
    >
      <ScraperWorkbench />
    </AdminShell>
  );
}
