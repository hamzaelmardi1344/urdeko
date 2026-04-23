import Link from "next/link";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { LinkButton } from "@/components/ui/LinkButton";
import { getProjectBundle } from "@/lib/projects";
import type { PhotoAnalysis } from "@/lib/ai/gemini";

export const metadata = { title: "Photo à améliorer" };

export default async function PhotoAmeliorerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
  const photo = bundle?.photos[0];
  const analysis = (photo?.analysisJson as PhotoAnalysis | null) ?? null;
  const reasons = analysis?.reasons?.length
    ? analysis.reasons
    : [
        "Cadrage trop serré : recule d'un mètre.",
        "Photo sombre : pense à allumer ou ouvrir les rideaux.",
      ];

  return (
    <>
      <TopAppBar title="03 · Photo" backHref={`/projets/${id}/photo/import`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
            <Icon name="sentiment_dissatisfied" size={28} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Aidez-nous à mieux voir votre pièce
          </h1>
          <p className="mt-3 font-body text-on-surface-variant">
            Quelques ajustements et votre rendu sera impeccable.
          </p>
        </section>

        {photo?.originalUrl ? (
          <div className="mb-8 overflow-hidden rounded-2xl shadow-ambient">
            <img
              src={photo.originalUrl}
              alt="Votre photo"
              className="h-60 w-full object-cover opacity-80"
            />
          </div>
        ) : null}

        <ul className="flex flex-col gap-3">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-ambient"
            >
              <Icon name="tips_and_updates" className="text-primary" size={22} />
              <p className="font-body text-sm text-on-surface">{reason}</p>
            </li>
          ))}
        </ul>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <div className="flex flex-col gap-3">
          <LinkButton href={`/projets/${id}/photo/import`}>
            Reprendre la photo
            <Icon name="add_a_photo" size={20} />
          </LinkButton>
          <Link
            href={`/projets/${id}/photo/preparation`}
            className="mx-auto text-sm font-semibold text-on-surface-variant underline underline-offset-4"
          >
            Continuer quand même
          </Link>
        </div>
      </StickyCTA>
    </>
  );
}
