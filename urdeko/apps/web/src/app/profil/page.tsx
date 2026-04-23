import Link from "next/link";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { auth, signOut } from "@/lib/auth";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const session = await auth();
  return (
    <>
      <TopAppBar showMenu />
      <FlowShell bottomPadding="nav">
        <section className="mb-8">
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Profil
          </h1>
          {session?.user?.email ? (
            <p className="mt-2 text-on-surface-variant">Connecté en tant que <b>{session.user.email}</b></p>
          ) : (
            <p className="mt-2 text-on-surface-variant">
              Connectez-vous pour retrouver vos projets sur tous vos appareils.
            </p>
          )}
        </section>

        {!session?.user ? (
          <Link
            href="/connexion"
            className="flex items-center justify-between rounded-2xl bg-primary-container p-5 font-headline text-on-primary-container shadow-glow-sm"
          >
            <span className="font-bold">Se connecter</span>
            <Icon name="arrow_forward" />
          </Link>
        ) : (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-2xl bg-surface-container-lowest p-5 font-headline font-bold text-on-surface shadow-ambient"
            >
              <span>Se déconnecter</span>
              <Icon name="logout" />
            </button>
          </form>
        )}
      </FlowShell>
      <BottomNavBar />
    </>
  );
}
