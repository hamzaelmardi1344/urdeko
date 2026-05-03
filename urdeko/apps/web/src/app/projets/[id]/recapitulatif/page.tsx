import { notFound } from "next/navigation";
import { Icon, formatMad } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { LinkButton } from "@/components/ui/LinkButton";
import { BudgetBar } from "@/components/flow/BudgetBar";
import { ELEMENT_CATEGORIES, getPalette, getStyle } from "@/lib/domain";
import { getAccessibleProjectBundle } from "@/lib/projects";
import { getProduct } from "@/lib/catalogue";

export const metadata = { title: "Récapitulatif" };

export default async function RecapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAccessibleProjectBundle(id);
  if (!bundle) notFound();

  const style = getStyle(bundle.project.style);
  const palette = getPalette(bundle.project.palette);
  const enrichedSelections = await Promise.all(
    bundle.selections.map(async (sel) => ({
      selection: sel,
      product: await getProduct(sel.productId),
      meta: ELEMENT_CATEGORIES.find((c) => c.id === sel.category),
    })),
  );

  return (
    <>
      <TopAppBar title="08 · Récapitulatif" backHref={`/projets/${id}/produits/preparation`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-8">
          <h1 className="mb-2 font-headline text-headline-md font-extrabold tracking-tight">
            {bundle.project.name}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {style?.label ?? "—"} · {palette?.label ?? "Palette UrdeKo"} ·{" "}
            {bundle.elements.length} catégories
          </p>
        </section>

        <BudgetBar used={bundle.totalMad} total={bundle.project.budgetMad} />

        <ul className="mt-8 flex flex-col gap-3">
          {enrichedSelections.map(({ selection, product, meta }) =>
            product && meta ? (
              <li
                key={selection.id}
                className="flex gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name={meta.icon} size={18} className="text-primary" />
                    <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {meta.label}
                    </span>
                  </div>
                  <p className="font-headline text-base font-bold leading-tight">
                    {product.name}
                  </p>
                  <p className="text-xs text-on-surface-variant">{product.brand}</p>
                  <p className="mt-1 font-headline text-sm font-black text-primary">
                    {formatMad(product.priceMad)}
                  </p>
                </div>
              </li>
            ) : null,
          )}
        </ul>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <LinkButton href={`/projets/${id}/coordonnees`}>
          Finaliser mon projet
          <Icon name="arrow_forward" size={20} />
        </LinkButton>
      </StickyCTA>
    </>
  );
}
