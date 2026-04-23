import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Vérifie tes emails" };

export default function VerifyPage() {
  return (
    <>
      <TopAppBar title="Connexion" backHref="/connexion" />
      <FlowShell bottomPadding="none">
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="mark_email_read" filled size={36} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Vérifiez vos emails
          </h1>
          <p className="max-w-sm font-body text-on-surface-variant">
            Nous venons de vous envoyer un lien magique. Ouvrez-le depuis cet appareil pour
            vous connecter à votre espace UrdeKo.
          </p>
        </section>
      </FlowShell>
    </>
  );
}
