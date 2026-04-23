"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@urdeko/design-system";

export type TopAppBarProps = {
  title?: string;
  backHref?: string;
  showMenu?: boolean;
  action?: React.ReactNode;
};

export function TopAppBar({ title, backHref, showMenu = false, action }: TopAppBarProps) {
  const reduced = useReducedMotion();
  return (
    <motion.header
      initial={reduced ? false : { y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-lg items-center justify-between bg-surface-container-low/80 backdrop-blur-xl px-5 py-4"
    >
      <div className="flex items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors active:bg-surface-container"
            aria-label="Retour"
          >
            <Icon name="arrow_back" size={24} />
          </Link>
        ) : showMenu ? (
          <button
            type="button"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-surface-container"
            aria-label="Menu"
          >
            <Icon name="menu" size={28} />
          </button>
        ) : (
          <span className="inline-block w-10" />
        )}
      </div>
      {title ? (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          {title}
        </h1>
      ) : (
        <Link
          href="/"
          className="pointer-events-auto text-2xl font-black tracking-tighter text-primary"
        >
          UrdeKo
        </Link>
      )}
      <div className="flex h-10 w-10 items-center justify-center">{action}</div>
    </motion.header>
  );
}
