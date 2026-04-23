"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Icon, cn } from "@urdeko/design-system";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/projets", label: "Projets", icon: "architecture" },
  { href: "/inspiration", label: "Inspiration", icon: "auto_awesome" },
  { href: "/profil", label: "Profil", icon: "person" },
] as const;

export function BottomNavBar() {
  const pathname = usePathname() ?? "/";
  const reduced = useReducedMotion();

  return (
    <motion.nav
      initial={reduced ? false : { y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-lg items-center justify-around rounded-t-[3rem] frosted-pane px-4 pb-6 pt-2 shadow-[0_-4px_40px_-5px_rgba(46,47,45,0.06)]"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-col items-center justify-center rounded-full p-3"
          >
            {active ? (
              <motion.span
                layoutId="bottom-nav-pill"
                className="absolute inset-0 rounded-full bg-primary-container shadow-glow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex flex-col items-center transition-colors",
                active
                  ? "text-on-primary-container"
                  : "text-on-surface/80 hover:text-on-surface",
              )}
            >
              <Icon name={item.icon} filled={active} size={22} className="mb-1" />
              <span className="font-label text-[10px] font-bold uppercase tracking-widest">
                {item.label}
              </span>
            </span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
