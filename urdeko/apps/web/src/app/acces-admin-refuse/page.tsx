import Link from "next/link";
import { auth } from "@/lib/auth";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Accès admin" };

export default async function AccesAdminRefusePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  return (
    <>
      <TopAppBar title="Administration" backHref="/" />
      <FlowShell bottomPadding="cta">
        <h1 className="mb-4 font-headline text-headline-md font-extrabold tracking-tight text-on-surface">
          Accès administrateur refusé
        </h1>
        <p className="mb-4 font-body text-on-surface-variant">
          Tu es bien connecté
          {email ? (
            <>
              {" "}
              en tant que <strong className="text-on-surface">{email}</strong>
            </>
          ) : null}
          , mais ce compte n’est <strong>pas</strong> autorisé à ouvrir le backoffice.
        </p>
        <div className="mb-8 rounded-xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
          <p className="mb-2 font-semibold text-on-surface">À faire (Vercel)</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Ouvre <strong>Project → Settings → Environment Variables</strong>.
            </li>
            <li>
              Vérifie la variable <code className="rounded bg-surface-container px-1">ADMIN_EMAILS</code> : elle
              doit contenir <strong>exactement</strong> ton email de connexion (minuscules), séparé par des
              virgules s’il y en a plusieurs.
            </li>
            <li>
              Exemple : <code className="rounded bg-surface-container px-1">ADMIN_EMAILS=toi@gmail.com</code>
            </li>
            <li>
              Enregistre puis <strong>redéploie</strong> le projet pour appliquer les variables.
            </li>
          </ol>
        </div>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-headline font-bold text-on-primary"
        >
          Retour à l’accueil
        </Link>
      </FlowShell>
    </>
  );
}
