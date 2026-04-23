"use client";

import { motion } from "framer-motion";
import { cn } from "@urdeko/design-system";

export type PageLoaderProps = {
  /** Libellé affiché sous le logo. */
  label?: string;
  /** Petit complément en dessous du libellé (ex: "Étape 02 · Espace"). */
  hint?: string;
  /** Si true, prend tout le viewport (utilisé dans loading.tsx). Sinon inline. */
  fullscreen?: boolean;
  className?: string;
};

/**
 * Loader de page UrdeKo : logotype pulsant + orbe glow + libellé.
 * Conçu pour être posé dans les `loading.tsx` entre chaque étape.
 */
export function PageLoader({
  label = "Chargement…",
  hint,
  fullscreen = true,
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        fullscreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-xl"
          : "flex w-full items-center justify-center py-16",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-primary-container/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-2 rounded-full bg-primary-container/60"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.span
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-glow"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          >
            <span className="font-headline text-xl font-black tracking-tighter">U</span>
          </motion.span>
        </div>
        <motion.p
          className="font-headline text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {label}
        </motion.p>
        {hint ? (
          <motion.p
            className="max-w-[260px] text-center text-xs text-on-surface-variant/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {hint}
          </motion.p>
        ) : null}
        <span className="sr-only">Chargement de la page UrdeKo</span>
      </div>
    </div>
  );
}
