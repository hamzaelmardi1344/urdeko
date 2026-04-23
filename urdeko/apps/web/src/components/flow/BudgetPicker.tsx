"use client";

import { useState } from "react";
import { cn, formatMad } from "@urdeko/design-system";
import { BUDGET_PRESETS, DEFAULT_BUDGET_MAD, DEFAULT_FLEXIBILITY } from "@/lib/domain";

export function BudgetPicker({
  initialBudget = DEFAULT_BUDGET_MAD,
  initialFlexibility = DEFAULT_FLEXIBILITY,
}: {
  initialBudget?: number;
  initialFlexibility?: number;
}) {
  const [budget, setBudget] = useState<number>(initialBudget);
  const [flex, setFlex] = useState<number>(initialFlexibility);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="ml-1 font-label text-label-sm font-bold uppercase tracking-[0.15em] text-on-surface-variant">
          Budget estimé
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBudget(value)}
              className={cn(
                "rounded-md px-4 py-2 font-label text-sm font-semibold transition-all active:scale-[0.98]",
                budget === value
                  ? "bg-primary-container text-on-primary-container shadow-glow-sm"
                  : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              {formatMad(value)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-container-lowest/60 p-4">
          <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
            Personnalisé
          </span>
          <input
            type="number"
            name="budgetMad"
            value={budget}
            min={500}
            step={500}
            onChange={(event) => setBudget(Number(event.target.value))}
            className="flex-1 border-0 bg-transparent text-right text-body-lg font-semibold text-on-surface outline-none"
          />
          <span className="font-label text-sm font-semibold text-on-surface-variant">MAD</span>
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between ml-1">
          <span className="font-label text-label-sm font-bold uppercase tracking-[0.15em] text-on-surface-variant">
            Flexibilité sur le budget
          </span>
          <span className="font-headline text-sm font-bold text-primary">±{flex}%</span>
        </label>
        <input
          type="range"
          name="flexibility"
          min={0}
          max={50}
          step={5}
          value={flex}
          onChange={(event) => setFlex(Number(event.target.value))}
          className="mt-3 w-full accent-primary"
        />
      </div>
    </div>
  );
}
