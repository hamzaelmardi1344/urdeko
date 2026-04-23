import * as React from "react";
import { cn } from "../utils/cn";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "whitespace-nowrap rounded-md px-5 py-2.5 font-label text-sm font-semibold tracking-wide transition-all active:scale-[0.98]",
        selected
          ? "bg-primary-container text-on-primary-container shadow-glow-sm"
          : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
