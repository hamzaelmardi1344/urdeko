import { Badge, Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { PALETTES } from "@/lib/domain";
import { selectPaletteAction } from "@/lib/actions";
import { getProjectOrThrow } from "@/lib/projects";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Choisir la palette" };

export default async function PalettePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);
  const action = selectPaletteAction.bind(null, id);

  return (
    <>
      <TopAppBar title="05 · Palette" backHref={`/projets/${id}/style`} />
      <FlowShell bottomPadding="cta">
        <MotionIn as="section" className="mb-8">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Votre palette de couleurs
          </h1>
          <p className="font-body text-on-surface-variant">
            Chaque palette guide notre IA pour la sélection des produits et la mise en lumière.
          </p>
        </MotionIn>

        <MotionStagger
          as="form"
          id="palette-form"
          action={action}
          className="flex flex-col gap-4"
        >
          {PALETTES.map((palette) => (
            <MotionStaggerItem
              as="label"
              key={palette.id}
              className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-surface-container-low p-5 transition-all hover:-translate-y-0.5 hover:shadow-ambient has-[:checked]:bg-surface-container-lowest has-[:checked]:shadow-ambient has-[:checked]:ring-2 has-[:checked]:ring-primary-container"
            >
              <input
                type="radio"
                name="palette"
                value={palette.id}
                defaultChecked={project.palette === palette.id}
                required
                className="peer sr-only"
              />
              <div className="flex -space-x-2">
                {palette.colors.map((color) => (
                  <span
                    key={color}
                    className="h-10 w-10 rounded-full border-2 border-surface-container-lowest shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-lg font-bold">{palette.label}</h3>
                  {"recommended" in palette && palette.recommended ? (
                    <Badge tone="primary">Recommandée</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-on-surface-variant">{palette.description}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-primary opacity-0 transition-opacity peer-checked:opacity-100">
                <Icon name="check_circle" filled size={28} />
              </span>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="palette-form" label="Valider ma palette" />
      </StickyCTA>
    </>
  );
}
