import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { ELEMENT_CATEGORIES } from "@/lib/domain";
import { setElementsAction } from "@/lib/actions";
import { getProjectBundle } from "@/lib/projects";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Choisir les éléments" };

export default async function ElementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
  const selected = new Set(bundle?.elements ?? []);
  const action = setElementsAction.bind(null, id);

  return (
    <>
      <TopAppBar title="06 · Éléments" backHref={`/projets/${id}/palette`} />
      <FlowShell bottomPadding="cta">
        <MotionIn as="section" className="mb-8">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Choisir les éléments à inclure
          </h1>
          <p className="font-body text-on-surface-variant">
            Sélectionnez les catégories de produits que notre IA devra intégrer au rendu final.
          </p>
        </MotionIn>

        <MotionStagger
          as="form"
          id="elements-form"
          action={action}
          className="grid grid-cols-2 gap-4"
        >
          {ELEMENT_CATEGORIES.map((cat) => (
            <MotionStaggerItem
              as="label"
              key={cat.id}
              className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-surface-container-low p-5 transition-all hover:-translate-y-0.5 hover:shadow-ambient has-[:checked]:bg-primary-container has-[:checked]:text-on-primary-container has-[:checked]:shadow-glow-sm"
            >
              <input
                type="checkbox"
                name="categories"
                value={cat.id}
                defaultChecked={selected.has(cat.id)}
                className="peer sr-only"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-primary">
                <Icon name={cat.icon} size={24} />
              </span>
              <span className="font-headline text-sm font-semibold tracking-tight">
                {cat.label}
              </span>
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-on-primary-container/10 text-on-primary-container opacity-0 transition-opacity peer-checked:opacity-100">
                <Icon name="check" filled size={14} />
              </span>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <SubmitButton form="elements-form" label="Explorer les produits" />
      </StickyCTA>
    </>
  );
}
