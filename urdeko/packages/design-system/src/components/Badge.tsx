import * as React from "react";
import { cn } from "../utils/cn";

export type BadgeTone = "primary" | "neutral" | "success" | "warning" | "error";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  neutral: "bg-surface-container-highest text-on-surface",
  success: "bg-primary/10 text-primary",
  warning: "bg-tertiary-container/40 text-on-tertiary-container",
  error: "bg-error-container text-on-error",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
