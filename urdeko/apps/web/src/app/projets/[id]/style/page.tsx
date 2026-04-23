import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { STYLES } from "@/lib/domain";
import { selectStyleAction } from "@/lib/actions";
import { getProjectOrThrow } from "@/lib/projects";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Choisir le style" };

export default async function StylePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);
  const action = selectStyleAction.bind(null, id);

  return (
    <>
      <TopAppBar title="04 · Style" backHref={`/projets/${id}/photo/pret`} />
      <FlowShell bottomPadding="cta">
        <MotionIn as="section" className="mb-8">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Quelle ambiance vous ressemble ?
          </h1>
          <p className="font-body text-on-surface-variant">
            Un seul choix pour commencer. Vous pourrez ajuster la palette juste après.
          </p>
        </MotionIn>

        <MotionStagger
          as="form"
          id="style-form"
          action={action}
          className="grid grid-cols-2 gap-4"
          staggerChildren={0.05}
        >
          {STYLES.map((style) => (
            <MotionStaggerItem
              as="label"
              key={style.id}
              className="group relative flex aspect-[4/5] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl bg-surface-container-low transition-all hover:shadow-ambient has-[:checked]:ring-2 has-[:checked]:ring-primary-container has-[:checked]:ring-offset-2 has-[:checked]:ring-offset-surface"
            >
              <input
                type="radio"
                name="style"
                value={style.id}
                defaultChecked={project.style === style.id}
                required
                className="peer sr-only"
              />
              <img
                src={style.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="relative z-10 bg-gradient-to-t from-black/80 to-transparent p-4 text-on-primary">
                <p className="font-headline text-lg font-bold text-white">{style.label}</p>
                <p className="mt-1 text-xs text-white/80 line-clamp-2">{style.description}</p>
              </div>
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary opacity-0 transition-opacity peer-checked:opacity-100">
                <Icon name="check" filled size={18} />
              </span>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="style-form" label="Voir les palettes" />
      </StickyCTA>
    </>
  );
}
