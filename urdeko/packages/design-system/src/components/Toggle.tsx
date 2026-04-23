import * as React from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  label,
  checked,
  onChange,
  name,
  disabled,
  className,
}: ToggleProps) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center justify-between rounded-xl bg-surface-container-low/40 p-6 transition-colors hover:bg-surface-container-low",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="flex-1 pr-6 font-body text-body-lg font-semibold text-on-surface">
        {label}
      </span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            "relative h-8 w-14 rounded-full transition-colors duration-300",
            checked ? "bg-primary-container" : "bg-outline-variant/30",
          )}
        >
          <span
            className={cn(
              "absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300",
              checked ? "translate-x-6" : "translate-x-0",
            )}
          >
            {checked ? <Icon name="check" size={16} className="text-primary" /> : null}
          </span>
        </span>
      </span>
    </label>
  );
}
