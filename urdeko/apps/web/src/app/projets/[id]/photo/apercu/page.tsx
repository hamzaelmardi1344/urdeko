import { redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { LinkButton } from "@/components/ui/LinkButton";
import { getAccessibleProjectBundle } from "@/lib/projects";
import type { PhotoAnalysis } from "@/lib/ai/gemini";

export const metadata = { title: "Aperçu photo" };

export default async function PhotoApercuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAccessibleProjectBundle(id);
  const photo = bundle?.photos[0];
  if (!photo) redirect(`/projets/${id}/photo/import`);

  const analysis = (photo?.analysisJson as PhotoAnalysis | null) ?? null;
  const valid = analysis?.valid ?? true;

  return (
    <>
      <TopAppBar title="03 · Photo" backHref={`/projets/${id}/photo/import`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-6">
          <h1 className="mb-2 font-headline text-headline-md font-extrabold tracking-tight">
            Aperçu de votre photo
          </h1>
          <p className="font-body text-on-surface-variant">
            {valid
              ? "Nous avons bien reçu votre photo. Notre IA peut maintenant préparer l'espace."
              : "Nous avons détecté quelques points qui pourraient améliorer le rendu."}
          </p>
        </section>

        <div className="overflow-hidden rounded-2xl shadow-ambient">
          <img
            src={photo!.originalUrl}
            alt="Votre photo"
            className="h-[420px] w-full object-cover"
          />
        </div>

        {analysis ? (
          <section className="mt-6 grid grid-cols-2 gap-3">
            <Stat icon="meeting_room" label="Espace" value={analysis.detected.roomType ?? "—"} />
            <Stat icon="light_mode" label="Lumière" value={analysis.detected.lighting} />
            <Stat icon="photo_size_select_large" label="Cadrage" value={analysis.detected.framing} />
            <Stat icon="grid_view" label="Encombrement" value={analysis.detected.clutter} />
          </section>
        ) : null}
      </FlowShell>

      <StickyCTA offset="bottom-8">
        {valid ? (
          <LinkButton href={`/projets/${id}/photo/preparation`}>
            Préparer mon espace
            <Icon name="auto_awesome" size={20} />
          </LinkButton>
        ) : (
          <LinkButton href={`/projets/${id}/photo/ameliorer`} variant="secondary">
            Améliorer la photo
          </LinkButton>
        )}
      </StickyCTA>
    </>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-ambient">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/10 text-primary">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <p className="truncate font-headline text-sm font-bold capitalize">{value}</p>
      </div>
    </div>
  );
}
