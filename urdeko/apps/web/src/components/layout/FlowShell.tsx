"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@urdeko/design-system";

export type FlowShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Espacement bas : varie selon qu'on ait une BottomNav, un CTA sticky, ou les deux. */
  bottomPadding?: "none" | "nav" | "nav-cta" | "cta";
  /** Désactive l'animation d'entrée du contenu si besoin. */
  animate?: boolean;
};

const padding: Record<NonNullable<FlowShellProps["bottomPadding"]>, string> = {
  none: "pb-16",
  nav: "pb-32",
  cta: "pb-40",
  "nav-cta": "pb-56",
};

export function FlowShell({
  children,
  className,
  bottomPadding = "nav-cta",
  animate = true,
}: FlowShellProps) {
  const reduced = useReducedMotion();
  const shouldAnimate = animate && !reduced;
  return (
    <motion.main
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className={cn(
        "mx-auto min-h-dvh w-full max-w-lg px-6 pt-24",
        padding[bottomPadding],
        className,
      )}
    >
      {children}
    </motion.main>
  );
}
