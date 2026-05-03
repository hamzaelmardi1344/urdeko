import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Accès admin" };

export default async function AccesAdminRefusePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  async function signOutToAdmin() {
    "use server";
    await signOut({ redirectTo: "/admin/connexion" });
  }

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
          , mais ce compte n’a <strong>pas</strong> le rôle requis pour cette page.
        </p>
        <div className="mb-8 rounded-xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
          <p className="mb-2 font-semibold text-on-surface">Connexion admin dédiée</p>
          <p>
            Déconnecte ce compte puis demande un lien backoffice avec une adresse invitée.
            Les partenaires doivent être invités par un super admin avant leur première connexion.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={signOutToAdmin}>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-headline font-bold text-on-primary"
            >
              Changer de compte admin
            </button>
          </form>
          <Link
            href="/admin/connexion"
            className="inline-flex h-12 items-center justify-center rounded-md bg-surface-container px-6 font-headline font-bold text-on-surface"
          >
            Demander un lien admin
          </Link>
        </div>
      </FlowShell>
    </>
  );
}
