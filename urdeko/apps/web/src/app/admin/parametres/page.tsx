import { revalidatePath } from "next/cache";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllSettings, setSetting, type SettingKey } from "@/lib/admin/settings";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

const GROUP_LABELS: Record<string, string> = {
  ia: "Intelligence artificielle",
  catalogue: "Catalogue & projets",
  quotas: "Quotas & rate limits",
  flags: "Feature flags",
  autre: "Autres",
};

async function updateSettingAction(formData: FormData) {
  "use server";
  const { email } = await requireAdmin();
  const key = formData.get("key");
  const kind = formData.get("kind");
  if (typeof key !== "string" || typeof kind !== "string") return;

  let value: unknown;
  if (kind === "boolean") value = formData.get("value") === "on";
  else value = formData.get("value");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  await setSetting(key as SettingKey, value, user?.id ?? null);
  revalidatePath("/admin/parametres");
}

export default async function AdminSettingsPage() {
  const { email } = await requireAdmin();
  const all = await getAllSettings();

  const groups = all.reduce<Record<string, typeof all>>((acc, item) => {
    const g = item.def.group;
    (acc[g] ??= []).push(item);
    return acc;
  }, {});

  return (
    <AdminShell
      userEmail={email}
      title="Paramètres application"
      subtitle="Feature flags, quotas IA, valeurs par défaut — modifiables à chaud"
    >
      <div className="space-y-8">
        {Object.entries(groups).map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">
              {GROUP_LABELS[group] ?? group}
            </h2>
            <div className="space-y-3">
              {items.map(({ def, value, stored, updatedAt }) => (
                <form
                  key={def.key}
                  action={updateSettingAction}
                  className="flex flex-col gap-3 rounded-2xl border border-outline/10 bg-surface-container-lowest p-4 md:flex-row md:items-center md:gap-4"
                >
                  <input type="hidden" name="key" value={def.key} />
                  <input type="hidden" name="kind" value={def.kind} />

                  <div className="flex-1">
                    <h3 className="font-headline text-base font-extrabold">{def.label}</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {def.description}
                    </p>
                    <p className="mt-1 text-[10px] font-mono text-on-surface-variant/70">
                      {def.key}
                      {stored && updatedAt ? (
                        <span>
                          {" "}
                          · modifié le{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(updatedAt))}
                        </span>
                      ) : (
                        <span> · par défaut</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {def.kind === "boolean" ? (
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="value"
                          defaultChecked={Boolean(value)}
                          className="peer sr-only"
                        />
                        <span className="h-7 w-12 rounded-full bg-outline/30 transition-colors peer-checked:bg-primary" />
                        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                      </label>
                    ) : def.kind === "number" ? (
                      <input
                        type="number"
                        name="value"
                        defaultValue={String(value ?? "")}
                        className="w-32 rounded-lg border border-outline/20 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    ) : (
                      <input
                        type="text"
                        name="value"
                        defaultValue={String(value ?? "")}
                        className="min-w-[240px] rounded-lg border border-outline/20 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    )}
                    <button
                      type="submit"
                      className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
