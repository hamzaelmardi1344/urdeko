import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { LinkButton } from "@/components/ui/LinkButton";

export const metadata = { title: "Guide photo" };

const TIPS = [
  {
    icon: "photo_size_select_large",
    title: "Cadrez large",
    body: "Montrez la pièce entière, sol aux plafonds, pour que notre IA comprenne le volume.",
  },
  {
    icon: "light_mode",
    title: "Lumière naturelle",
    body: "Prenez la photo le matin ou en milieu de journée, rideaux ouverts.",
  },
  {
    icon: "cleaning_services",
    title: "Ne rangez pas parfaitement",
    body: "Laissez la pièce telle qu'elle est : nous retirerons le mobilier pour vous.",
  },
  {
    icon: "stay_current_portrait",
    title: "Format portrait 4:3 ou 3:4",
    body: "Évitez les panoramiques. Tenez le téléphone droit, à hauteur de poitrine.",
  },
] as const;

export default async function PhotoGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <TopAppBar title="03 · Photo" backHref={`/projets/${id}/espace`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-10">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Quelques conseils avant de prendre la photo
          </h1>
          <p className="font-body text-on-surface-variant">
            Plus la photo est lisible, plus le rendu final sera fidèle à votre pièce.
          </p>
        </section>

        <ul className="flex flex-col gap-5">
          {TIPS.map((tip) => (
            <li
              key={tip.title}
              className="flex items-start gap-5 rounded-2xl bg-surface-container-low/60 p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-ambient">
                <Icon name={tip.icon} size={26} />
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold tracking-tight">{tip.title}</h3>
                <p className="font-body text-on-surface-variant">{tip.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <LinkButton href={`/projets/${id}/photo/import`}>
          J'ai compris, je prends la photo
          <Icon name="photo_camera" size={20} />
        </LinkButton>
      </StickyCTA>
    </>
  );
}
