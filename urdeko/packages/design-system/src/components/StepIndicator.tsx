import * as React from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";

export type Step = {
  label: string;
  status: "completed" | "active" | "upcoming";
};

export interface StepIndicatorProps {
  steps: Step[];
  className?: string;
}

export function StepIndicator({ steps, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <React.Fragment key={`${step.label}-${idx}`}>
            <div
              className={cn(
                "flex items-start gap-4",
                step.status === "active" &&
                  "relative -ml-4 rounded-lg bg-surface-container-lowest px-4 py-3 shadow-ambient",
                step.status === "upcoming" && "opacity-40",
              )}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.status === "completed" ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-glow-sm">
                    <Icon name="check" filled size={16} weight={700} />
                  </div>
                ) : step.status === "active" ? (
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-lowest text-primary-container">
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-container-high bg-surface-container-high">
                    <div className="h-2 w-2 rounded-full bg-on-surface-variant/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3
                  className={cn(
                    "font-headline text-body-lg",
                    step.status === "active"
                      ? "font-bold text-primary"
                      : step.status === "completed"
                        ? "font-semibold text-on-surface"
                        : "font-medium text-on-surface-variant",
                  )}
                >
                  {step.label}
                </h3>
              </div>
            </div>
            {!isLast ? (
              <div
                className={cn(
                  "my-1 ml-[14px] h-6 w-px",
                  step.status === "completed"
                    ? "bg-primary-container/40"
                    : "bg-surface-container-high",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
