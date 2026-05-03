import { redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { BeforeAfter } from "@/components/flow/BeforeAfter";
import { LinkButton } from "@/components/ui/LinkButton";
import { RetryEmptyRoomButton } from "@/components/flow/RetryEmptyRoomButton";
import { RscAlignOnMount } from "@/components/flow/RscAlignOnMount";
import { getAccessibleProjectBundle } from "@/lib/projects";

export const metadata = { title: "Espace prêt" };
export const dynamic = "force-dynamic";

export default async function ReadyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAccessibleProjectBundle(id);
  const photo = bundle?.photos[0];
  if (!photo?.emptiedUrl || !photo.originalUrl) {
    redirect(`/projets/${id}/photo/preparation`);
  }

  return (
    <>
      <RscAlignOnMount />
      <TopAppBar title="03 · Photo" backHref={`/projets/${id}/photo/import`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="check" filled size={28} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Votre espace est prêt !
          </h1>
          <p className="mt-3 font-body text-on-surface-variant">
            Glissez le curseur pour comparer avant / après. Prêt à choisir votre style ?
          </p>
        </section>

        <BeforeAfter beforeUrl={photo.originalUrl} afterUrl={photo.emptiedUrl} />

        <div className="mt-6 flex flex-col items-center gap-2">
          <RetryEmptyRoomButton
            projectId={id}
            label="Relancer l'IA sur cette photo"
            variant="secondary"
            className="max-w-xs"
          />
          <p className="text-center text-xs text-on-surface-variant/80">
            La pièce n'est pas complètement vidée ? Relance l'étape avec un
            prompt plus agressif, sans réuploader votre photo.
          </p>
        </div>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <LinkButton href={`/projets/${id}/style`}>
          Choisir mon style
          <Icon name="arrow_forward" size={20} />
        </LinkButton>
      </StickyCTA>
    </>
  );
}
