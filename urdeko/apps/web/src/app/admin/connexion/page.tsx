import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Icon, InputField } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { auth } from "@/lib/auth";
import { isAdminAllowedEmail, normalizeAdminEmail } from "@/lib/admin/emails";
import { sendAdminMagicLink } from "@/lib/admin/magic-link";
import { env } from "@/env";

export const metadata = { title: "Connexion admin" };

function requestOrigin(headersList: Headers): string {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (!host) return env.AUTH_URL.replace(/\/$/, "");
  const proto =
    headersList.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

function errorMessage(error: string | undefined): string | null {
  switch (error) {
    case "rate_limit":
      return "Trop de liens demandés. Réessaie dans quelques minutes.";
    case "send":
      return "Impossible d'envoyer l'email pour le moment. Vérifie SMTP puis réessaie.";
    case "invalid":
      return "Ce lien admin est expiré ou déjà utilisé. Demande un nouveau lien.";
    default:
      return null;
  }
}

export default async function AdminConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const currentEmail = session?.user?.email ?? null;
  if (isAdminAllowedEmail(currentEmail)) {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const message = errorMessage(error);

  async function action(formData: FormData) {
    "use server";
    const email = normalizeAdminEmail(formData.get("email"));
    if (!email) {
      redirect("/admin/connexion?error=invalid");
    }

    try {
      await sendAdminMagicLink(email, requestOrigin(await headers()));
    } catch (err) {
      const message = (err as Error).message;
      const code = /trop de liens/i.test(message) ? "rate_limit" : "send";
      redirect(`/admin/connexion?error=${code}`);
    }

    redirect(`/admin/verification?email=${encodeURIComponent(email)}`);
  }

  return (
    <>
      <TopAppBar title="Admin" backHref="/" />
      <FlowShell bottomPadding="cta">
        <section className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="admin_panel_settings" filled size={32} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Connexion backoffice
          </h1>
          <p className="mt-3 font-body text-on-surface-variant">
            Reçois un lien sécurisé dédié à l'administration UrdeKo.
          </p>
        </section>

        {currentEmail ? (
          <div className="mb-5 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            Tu es connecté avec <strong className="text-on-surface">{currentEmail}</strong>.
            Utilise un email autorisé pour ouvrir le backoffice.
          </div>
        ) : null}

        {message ? (
          <div className="mb-5 rounded-xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {message}
          </div>
        ) : null}

        <form id="admin-signin-form" action={action} className="flex flex-col gap-4">
          <InputField
            label="Email administrateur"
            name="email"
            type="email"
            icon="mail"
            defaultValue={currentEmail ?? ""}
            required
          />
        </form>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="admin-signin-form" label="Recevoir le lien admin" icon="shield" />
      </StickyCTA>
    </>
  );
}
