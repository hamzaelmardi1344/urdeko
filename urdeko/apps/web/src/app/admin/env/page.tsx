import { revalidatePath } from "next/cache";
import { Icon } from "@urdeko/design-system";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import {
  findEnvFile,
  readEnvFile,
  SECRET_KEYS,
  writeEnvFile,
  type EnvLine,
} from "@/lib/admin/env-file";

export const metadata = { title: "Variables .env" };
export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV !== "production";

async function saveEnvAction(formData: FormData) {
  "use server";
  await requireAdmin();
  if (!IS_DEV) throw new Error("Édition .env désactivée en production");

  const path = formData.get("path");
  if (typeof path !== "string") throw new Error("path manquant");

  const updates: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("env::")) continue;
    const key = field.slice(5);
    updates[key] = typeof value === "string" ? value : "";
  }

  await writeEnvFile(path, updates);
  revalidatePath("/admin/env");
}

export default async function AdminEnvPage() {
  const { email } = await requireAdmin();

  if (!IS_DEV) {
    return (
      <AdminShell
        userEmail={email}
        title="Variables d'environnement"
        subtitle="Édition du .env"
      >
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm">
          <Icon name="lock" size={24} className="text-amber-700" />
          <h2 className="mt-2 font-headline text-lg font-extrabold">
            Désactivé en production
          </h2>
          <p className="mt-1 text-on-surface-variant">
            Pour des raisons de sécurité, l&apos;édition du fichier{" "}
            <code>.env</code> n&apos;est possible qu&apos;en environnement de
            développement local. Utilise le dashboard de ton hébergeur (Vercel,
            Fly.io…) en production.
          </p>
        </div>
      </AdminShell>
    );
  }

  const path = await findEnvFile();
  if (!path) {
    return (
      <AdminShell
        userEmail={email}
        title="Variables d'environnement"
        subtitle="Édition du .env.local"
      >
        <div className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-6">
          <p className="font-bold">Aucun fichier .env.local trouvé.</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Attendu dans <code>apps/web/.env.local</code> ou{" "}
            <code>.env.local</code> à la racine du monorepo.
          </p>
        </div>
      </AdminShell>
    );
  }

  const { lines } = await readEnvFile(path);
  const kvLines = lines.filter((l): l is Extract<EnvLine, { kind: "kv" }> =>
    l.kind === "kv",
  );

  return (
    <AdminShell
      userEmail={email}
      title="Variables d'environnement"
      subtitle={`${kvLines.length} variables · ${path}`}
      action={
        <span className="hidden items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-700 sm:flex">
          <Icon name="warning" size={14} />
          Restart du serveur requis après modif
        </span>
      }
    >
      <form action={saveEnvAction} className="space-y-3">
        <input type="hidden" name="path" value={path} />

        <div className="rounded-2xl border border-outline/10 bg-surface-container-lowest">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline/10 bg-surface-container-lowest p-3 text-xs">
            <span className="font-bold uppercase tracking-widest text-on-surface-variant/70">
              Clé
            </span>
            <span className="font-bold uppercase tracking-widest text-on-surface-variant/70">
              Valeur
            </span>
          </div>
          <ul className="divide-y divide-outline/5">
            {kvLines.map((line) => {
              const secret = SECRET_KEYS.has(line.key);
              return (
                <li
                  key={line.key}
                  className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4"
                >
                  <label
                    htmlFor={`env-${line.key}`}
                    className="min-w-[220px] font-mono text-sm font-bold"
                  >
                    {line.key}
                    {secret ? (
                      <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        secret
                      </span>
                    ) : null}
                  </label>
                  <input
                    id={`env-${line.key}`}
                    type={secret ? "password" : "text"}
                    name={`env::${line.key}`}
                    defaultValue={line.value}
                    className="flex-1 rounded-lg border border-outline/20 bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sticky bottom-4 flex items-center justify-between rounded-2xl bg-surface-container-high p-3 shadow-glow-sm">
          <p className="text-xs text-on-surface-variant">
            Un fichier <code>{`.env.local.bak`}</code> est créé automatiquement
            avant chaque sauvegarde.
          </p>
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-on-primary"
          >
            Sauvegarder le fichier
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
