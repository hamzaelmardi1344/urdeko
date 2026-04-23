"use client";

import { useFormStatus } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Icon, cn } from "@urdeko/design-system";

export function SubmitButton({
  form,
  label = "Continuer",
  icon = "arrow_forward",
  variant = "primary",
  className,
  disabled,
}: {
  form?: string;
  label?: string;
  icon?: string | null;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const reduced = useReducedMotion();
  const isDisabled = pending || Boolean(disabled);
  const base =
    variant === "primary"
      ? "glow-gradient text-on-primary-container shadow-glow hover:shadow-glow-sm"
      : "bg-surface-container-lowest text-on-surface shadow-ambient ghost-border";
  return (
    <motion.button
      type="submit"
      form={form}
      disabled={isDisabled}
      whileHover={reduced || isDisabled ? undefined : { y: -1 }}
      whileTap={reduced || isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-lg px-7 font-headline text-[1.0625rem] font-bold tracking-tight disabled:opacity-60 disabled:cursor-not-allowed",
        base,
        className,
      )}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" className="animate-spin" size={20} />
          <span className="sr-only">Envoi en cours</span>
        </>
      ) : icon ? (
        <>
          <span>{label}</span>
          <Icon name={icon} size={20} />
        </>
      ) : (
        <span>{label}</span>
      )}
    </motion.button>
  );
}
