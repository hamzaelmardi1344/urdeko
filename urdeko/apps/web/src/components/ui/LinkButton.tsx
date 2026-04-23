import Link, { type LinkProps } from "next/link";
import { cn } from "@urdeko/design-system";
import type { ButtonVariant, ButtonSize } from "@urdeko/design-system";

const variants: Record<ButtonVariant, string> = {
  primary:
    "glow-gradient text-on-primary-container shadow-glow hover:shadow-glow-sm hover:-translate-y-px",
  secondary:
    "bg-surface-container-lowest text-on-surface shadow-ambient hover:bg-surface-container-low ghost-border",
  ghost: "bg-transparent text-on-surface hover:bg-surface-container-low",
  danger: "bg-error text-on-error shadow-ambient hover:bg-error-dim",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-12 rounded-md px-5 text-[0.9375rem]",
  lg: "h-14 rounded-lg px-7 text-[1.0625rem]",
};

type Props = LinkProps & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function LinkButton({
  children,
  variant = "primary",
  size = "lg",
  className,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 font-headline font-bold tracking-tight transition-all duration-200 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
