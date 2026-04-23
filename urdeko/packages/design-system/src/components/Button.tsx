import * as React from "react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-headline font-bold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const variants: Record<ButtonVariant, string> = {
  primary:
    "glow-gradient text-on-primary-container shadow-glow hover:shadow-glow-sm hover:-translate-y-px",
  secondary:
    "bg-surface-container-lowest text-on-surface shadow-ambient hover:bg-surface-container-low ghost-border",
  ghost: "bg-transparent text-on-surface hover:bg-surface-container-low",
  danger:
    "bg-error text-on-error shadow-ambient hover:bg-error-dim",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-12 rounded-md px-5 text-[0.9375rem]",
  lg: "h-14 rounded-lg px-7 text-[1.0625rem]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "lg", className, children, loading, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span
          className="material-symbols-outlined animate-spin"
          aria-hidden="true"
          style={{ fontSize: 20 }}
        >
          progress_activity
        </span>
      ) : null}
      {children}
    </button>
  );
});
