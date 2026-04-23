import * as React from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    { label, icon, error, hint, className, required, id, ...props },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="ml-1 font-label text-label-sm font-bold uppercase tracking-[0.15em] text-on-surface-variant"
        >
          {label}
          {required ? <span className="text-primary"> *</span> : null}
        </label>
        <div className="group relative">
          {icon ? (
            <Icon
              name={icon}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors"
            />
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              "w-full rounded-t-lg bg-surface-container-lowest/50 border-b-2 border-outline-variant/30 py-5 pr-4 text-on-surface text-body-lg outline-none transition-colors",
              "placeholder:text-outline-variant/40 focus:border-primary",
              icon ? "pl-10" : "pl-4",
              error && "border-error",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <span id={`${inputId}-error`} className="ml-1 text-label-sm text-error">
            {error}
          </span>
        ) : hint ? (
          <span id={`${inputId}-hint`} className="ml-1 text-label-sm text-on-surface-variant/80">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);
