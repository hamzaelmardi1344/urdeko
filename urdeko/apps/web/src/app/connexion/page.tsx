import { Icon, InputField } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signIn } from "@/lib/auth";

export const metadata = { title: "Connexion" };

export default function SignInPage() {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await signIn("nodemailer", { email, redirectTo: "/projets" });
  }

  return (
    <>
      <TopAppBar title="Connexion" backHref="/" />
      <FlowShell bottomPadding="cta">
        <section className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="bolt" filled size={30} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Connexion sans mot de passe
          </h1>
          <p className="mt-3 font-body text-on-surface-variant">
            Entrez votre email, nous vous enverrons un lien magique de connexion.
          </p>
        </section>

        <form id="signin-form" action={action} className="flex flex-col gap-4">
          <InputField
            label="Adresse email"
            name="email"
            type="email"
            icon="mail"
            required
          />
        </form>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="signin-form" label="Recevoir le lien" icon="send" />
      </StickyCTA>
    </>
  );
}
