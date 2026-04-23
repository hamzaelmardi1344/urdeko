import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveContactAction } from "@/lib/actions";
import { getProjectBundle } from "@/lib/projects";
import { ContactFormClient } from "@/components/flow/ContactFormClient";

export const metadata = { title: "Vos coordonnées" };

export default async function CoordonneesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
  const contact = bundle?.contact ?? null;
  const action = saveContactAction.bind(null, id);

  return (
    <>
      <TopAppBar title="09 · Coordonnées" backHref={`/projets/${id}/recapitulatif`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-8">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Où envoyer votre rendu ?
          </h1>
          <p className="font-body text-on-surface-variant">
            Nous vous envoyons votre rendu photoréaliste dès qu'il est prêt.
          </p>
        </section>

        <ContactFormClient action={action} contact={contact} />
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="contact-form" label="Générer mon rendu" icon="auto_awesome" />
      </StickyCTA>
    </>
  );
}

export const dynamic = "force-dynamic";
