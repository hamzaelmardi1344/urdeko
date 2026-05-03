import { redirect } from "next/navigation";
import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { LinkButton } from "@/components/ui/LinkButton";
import { getAccessibleProjectBundle } from "@/lib/projects";
import { ELEMENT_CATEGORIES } from "@/lib/domain";

export const metadata = { title: "Préparation de la sélection" };

export default async function ProduitsPreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAccessibleProjectBundle(id);
  if (!bundle) redirect(`/projets/${id}`);
  const ordered = ELEMENT_CATEGORIES.filter((c) => bundle.elements.includes(c.id));
  const first = ordered[0];

  return (
    <>
      <TopAppBar title="07 · Sélection" backHref={`/projets/${id}/elements`} />
      <FlowShell bottomPadding="cta">
        <section className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
            <Icon name="auto_awesome" filled size={36} />
          </div>
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Nous préparons votre sélection
          </h1>
          <p className="max-w-sm font-body text-on-surface-variant">
            Notre IA a comparé votre style <b>{bundle.project.style}</b> et votre budget{" "}
            <b>{bundle.project.budgetMad.toLocaleString("fr-MA")} MAD</b> pour ne retenir que les
            produits cohérents.
          </p>
        </section>

        <ul className="mt-6 flex flex-col gap-3">
          {ordered.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/20 text-primary">
                <Icon name={category.icon} size={22} />
              </span>
              <div className="flex-1">
                <p className="font-headline font-bold">{category.label}</p>
                <p className="text-xs text-on-surface-variant">Prêt à explorer</p>
              </div>
              <Icon name="arrow_forward" className="text-on-surface-variant" size={20} />
            </li>
          ))}
        </ul>
      </FlowShell>

      <div className="fixed inset-x-0 bottom-8 z-30 mx-auto w-full max-w-lg px-6">
        {first ? (
          <LinkButton href={`/projets/${id}/produits/${first.id}`}>
            Commencer par {first.label.toLowerCase()}
            <Icon name="arrow_forward" size={20} />
          </LinkButton>
        ) : (
          <LinkButton href={`/projets/${id}/elements`} variant="secondary">
            Reprendre les éléments
          </LinkButton>
        )}
      </div>
    </>
  );
}
