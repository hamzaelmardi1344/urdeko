import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { auth, signIn, signOut } from "@/lib/auth";
import { getClaimableGuestProjectBundle } from "@/lib/projects";

export const metadata = { title: "Créer votre compte" };
export const dynamic = "force-dynamic";

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export default async function ProjectAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const [{ id }, { erreur }] = await Promise.all([params, searchParams]);
  const [bundle, session] = await Promise.all([
    getClaimableGuestProjectBundle(id),
    auth(),
  ]);
  if (!bundle) notFound();

  if (bundle.project.userId && session?.user?.id === bundle.project.userId) {
    redirect(`/projets/${id}/generation`);
  }

  const contact = bundle.contact;
  if (!contact) {
    redirect(`/projets/${id}/coordonnees`);
  }

  const magicEmail = contact.email;
  const contactEmail = normalizeEmail(magicEmail);
  const sessionEmail = normalizeEmail(session?.user?.email);
  const claimPath = `/connexion/rattacher?projectId=${id}&next=${encodeURIComponent(
    `/projets/${id}/generation`,
  )}`;

  if (session?.user?.id && sessionEmail === contactEmail) {
    redirect(claimPath);
  }

  async function sendMagicLink() {
    "use server";
    await signIn("nodemailer", {
      email: magicEmail,
      redirectTo: claimPath,
    });
  }

  async function signOutAndRetry() {
    "use server";
    await signOut({ redirectTo: `/projets/${id}/compte` });
  }

  const hasDifferentSession = Boolean(session?.user?.id && sessionEmail !== contactEmail);

  return (
    <>
      <TopAppBar title="10 · Compte" backHref={`/projets/${id}/coordonnees`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="mark_email_read" filled size={30} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Créez votre accès UrdeKo
          </h1>
          <p className="mt-3 font-body text-on-surface-variant">
            Votre compte sert à lancer le rendu, le recevoir par email et le retrouver plus tard.
          </p>
        </section>

        {hasDifferentSession ? (
          <section className="rounded-2xl bg-error/10 p-5 text-error">
            <div className="mb-3 flex items-center gap-2 font-headline font-bold">
              <Icon name="warning" size={22} />
              Compte différent détecté
            </div>
            <p className="text-sm leading-relaxed">
              Ce projet est lié à <strong>{contact.email}</strong>, mais vous êtes connecté avec{" "}
              <strong>{session?.user?.email}</strong>. Déconnectez-vous pour recevoir le lien sur
              la bonne adresse.
            </p>
            <form action={signOutAndRetry} className="mt-5">
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-error px-5 font-headline font-bold text-on-error"
              >
                Se déconnecter
                <Icon name="logout" size={18} />
              </button>
            </form>
          </section>
        ) : (
          <>
            {erreur === "email" ? (
              <div className="mb-5 rounded-xl bg-error/10 p-4 text-sm font-semibold text-error">
                Le lien utilisé ne correspond pas à l'email de ce projet. Demandez un nouveau lien
                ci-dessous.
              </div>
            ) : null}

            <form id="project-account-form" action={sendMagicLink} className="space-y-5">
              <input type="hidden" name="email" value={contact.email} />
              <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-ambient">
                <p className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Email du rendu
                </p>
                <p className="mt-2 break-all font-headline text-lg font-extrabold text-on-surface">
                  {contact.email}
                </p>
                <Link
                  href={`/projets/${id}/coordonnees`}
                  className="mt-3 inline-flex text-sm font-bold text-primary underline underline-offset-4"
                >
                  Changer l'email
                </Link>
              </div>

              <div className="rounded-2xl bg-surface-container-low p-5">
                <div className="flex gap-3">
                  <Icon name="lock" className="mt-0.5 text-primary" size={22} />
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Aucun mot de passe à créer. Le lien magique expire rapidement et rattache ce
                    projet à votre espace personnel.
                  </p>
                </div>
              </div>
            </form>
          </>
        )}
      </FlowShell>

      {!hasDifferentSession ? (
        <StickyCTA offset="bottom-8">
          <SubmitButton
            form="project-account-form"
            label="Recevoir mon lien sécurisé"
            icon="send"
          />
        </StickyCTA>
      ) : null}
    </>
  );
}
