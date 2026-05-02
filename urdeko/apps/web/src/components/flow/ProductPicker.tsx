"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Icon, cn, formatMad } from "@urdeko/design-system";
import type { Product } from "@/lib/catalogue";
import { completeSelectionsAction, selectProductAction } from "@/lib/actions";

type Props = {
  projectId: string;
  category: string;
  budgetMad: number;
  flexibility: number;
  products: Product[];
  initialSelection: string | null;
  next: { href: string; label: string };
  isFinal: boolean;
};

export function ProductPicker({
  projectId,
  category,
  budgetMad,
  flexibility,
  products,
  initialSelection,
  next,
  isFinal,
}: Props) {
  const router = useRouter();
  const [selection, setSelection] = useState<string | null>(initialSelection);
  const [pending, startTransition] = useTransition();

  const tolerance = budgetMad * (1 + flexibility / 100);

  const badge = (product: Product) => {
    if (product.priceMad <= budgetMad * 0.5) return { tone: "success" as const, label: "Économique" };
    if (product.priceMad > tolerance) return { tone: "warning" as const, label: "Hors budget" };
    return null;
  };

  const onContinue = async () => {
    if (!selection) return;
    const product = products.find((p) => p.id === selection);
    if (!product) return;
    startTransition(async () => {
      await selectProductAction({
        projectId,
        category,
        productId: product.id,
      });
      if (isFinal) {
        await completeSelectionsAction(projectId);
        return;
      }
      router.push(next.href);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {products.map((product) => {
          const active = selection === product.id;
          const b = badge(product);
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelection(product.id)}
              className={cn(
                "group relative flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl bg-surface-container-lowest text-left shadow-ambient transition-all active:scale-[0.99]",
                active && "ring-2 ring-primary-container ring-offset-2 ring-offset-surface",
              )}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-container">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {b ? (
                  <Badge tone={b.tone} className="absolute left-3 top-3">
                    {b.label}
                  </Badge>
                ) : null}
                {active ? (
                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
                    <Icon name="check" filled size={18} />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  {product.brand}
                </span>
                <p className="font-headline text-base font-bold leading-tight">
                  {product.name}
                </p>
                <p className="mt-1 font-headline text-sm font-black text-primary">
                  {formatMad(product.priceMad)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-8 z-30 mx-auto w-full max-w-lg px-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selection || pending}
          className="glow-gradient flex h-14 w-full items-center justify-center gap-2 rounded-lg px-7 font-headline text-[1.0625rem] font-bold tracking-tight text-on-primary-container shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? (
            <Icon name="progress_activity" className="animate-spin" size={20} />
          ) : (
            <>
              {next.label}
              <Icon name="arrow_forward" size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
