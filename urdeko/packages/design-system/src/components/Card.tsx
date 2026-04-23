import * as React from "react";
import { cn } from "../utils/cn";

export type CardTone = "base" | "low" | "high" | "lowest";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  floating?: boolean;
}

const toneClasses: Record<CardTone, string> = {
  base: "bg-surface",
  low: "bg-surface-container-low",
  high: "bg-surface-container-high",
  lowest: "bg-surface-container-lowest",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = "low", floating = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg p-6",
        toneClasses[tone],
        floating && "shadow-ambient",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
