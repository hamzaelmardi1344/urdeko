import { notFound } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { BudgetBar } from "@/components/flow/BudgetBar";
import { ProductPicker } from "@/components/flow/ProductPicker";
import { getAccessibleProjectBundle } from "@/lib/projects";
import { listProducts } from "@/lib/catalogue";
import { ELEMENT_CATEGORIES, type ElementCategoryId } from "@/lib/domain";

export const metadata = { title: "Produits" };

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}) {
  const { id, category } = await params;
  const meta = ELEMENT_CATEGORIES.find((c) => c.id === category);
  if (!meta) notFound();

  const bundle = await getAccessibleProjectBundle(id);
  if (!bundle) notFound();

  const products = await listProducts({
    category: meta.id as ElementCategoryId,
    style: bundle.project.style,
    budgetMad: bundle.project.budgetMad,
    flexibility: bundle.project.flexibility,
  });

  const ordered = ELEMENT_CATEGORIES.filter((c) => bundle.elements.includes(c.id));
  const currentIdx = ordered.findIndex((c) => c.id === meta.id);
  const nextCategory = ordered[currentIdx + 1];
  const prevCategory = ordered[currentIdx - 1];
  const existingSelection = bundle.selections.find((s) => s.category === meta.id);

  return (
    <>
      <TopAppBar
        title={`${String(currentIdx + 1).padStart(2, "0")} · ${meta.label}`}
        backHref={
          prevCategory
            ? `/projets/${id}/produits/${prevCategory.id}`
            : `/projets/${id}/produits/preparation`
        }
      />
      <FlowShell bottomPadding="cta">
        <section className="mb-5 flex flex-col gap-2">
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            {meta.label}
          </h1>
          <p className="font-body text-on-surface-variant">
            Sélection ajustée à votre style{" "}
            <b>{bundle.project.style ?? "choisi"}</b> et à votre budget de{" "}
            <b>{bundle.project.budgetMad.toLocaleString("fr-MA")} MAD</b>.
          </p>
        </section>

        <BudgetBar used={bundle.totalMad} total={bundle.project.budgetMad} />

        <div className="mt-8">
          <ProductPicker
            projectId={id}
            category={meta.id}
            budgetMad={bundle.project.budgetMad}
            flexibility={bundle.project.flexibility}
            products={products}
            initialSelection={existingSelection?.productId ?? null}
            next={
              nextCategory
                ? { href: `/projets/${id}/produits/${nextCategory.id}`, label: `Choisir ${nextCategory.label.toLowerCase()}` }
                : { href: `/projets/${id}/recapitulatif`, label: "Voir le récapitulatif" }
            }
            isFinal={!nextCategory}
          />
        </div>
      </FlowShell>
    </>
  );
}
