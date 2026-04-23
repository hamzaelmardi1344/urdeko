import { cn, formatMad } from "@urdeko/design-system";

export function BudgetBar({
  used,
  total,
  label = "Budget projet",
  className,
}: {
  used: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = Math.max(0, total - used);
  const over = used > total;
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-container-lowest p-4 shadow-ambient",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <span className="font-headline text-sm font-bold text-on-surface">
          {formatMad(used)} <span className="text-on-surface-variant/60">/ {formatMad(total)}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            over ? "bg-error" : "glow-gradient",
          )}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          over ? "text-error" : "text-on-surface-variant/80",
        )}
      >
        {over
          ? `Dépassement de ${formatMad(used - total)}`
          : `Il reste ${formatMad(remaining)}`}
      </p>
    </div>
  );
}
