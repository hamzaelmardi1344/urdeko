"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon, cn } from "@urdeko/design-system";

export function RetryEmptyRoomButton({
  projectId,
  label,
  variant = "secondary",
  className,
}: {
  projectId: string;
  label: string;
  variant?: "secondary" | "danger";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();

  async function run() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/empty-room/retry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : `Erreur ${res.status}`);
        return;
      }
      if (data.redirectTo) {
        window.location.assign(data.redirectTo);
        return;
      }
      setError("Réponse serveur inattendue.");
    } catch {
      setError("Réseau indisponible. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  const base =
    variant === "danger"
      ? "bg-error text-on-error shadow-none"
      : "bg-surface-container-lowest text-on-surface shadow-ambient ghost-border";

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <motion.button
        type="button"
        disabled={pending}
        onClick={run}
        whileHover={reduced || pending ? undefined : { y: -1 }}
        whileTap={reduced || pending ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
        className={cn(
          "flex h-14 w-full items-center justify-center gap-2 rounded-lg px-7 font-headline text-[1.0625rem] font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-60",
          base,
          className,
        )}
      >
        {pending ? (
          <>
            <Icon name="progress_activity" className="animate-spin" size={20} />
            <span className="sr-only">Envoi en cours</span>
          </>
        ) : (
          <>
            <span>{label}</span>
            <Icon name="refresh" size={20} />
          </>
        )}
      </motion.button>
      {error ? (
        <p className="text-center text-xs font-semibold text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
