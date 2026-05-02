import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Lien admin envoyé" };

function displayEmail(email: string | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  return email;
}

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const shownEmail = displayEmail(email);

  return (
    <>
      <TopAppBar title="Admin" backHref="/admin/connexion" />
      <FlowShell bottomPadding="none">
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="mark_email_read" filled size={36} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Lien admin envoyé
          </h1>
          <p className="max-w-sm font-body text-on-surface-variant">
            Si cet email est autorisé, un lien de connexion au backoffice vient d'être
            envoyé{shownEmail ? <> à <strong>{shownEmail}</strong></> : null}. Il expire
            dans 15 minutes.
          </p>
        </section>
      </FlowShell>
    </>
  );
}
