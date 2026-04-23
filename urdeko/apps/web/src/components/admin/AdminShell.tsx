"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@urdeko/design-system";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
};

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Général",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: "dashboard" },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/produits", label: "Produits", icon: "inventory_2" },
      { href: "/admin/produits/scraper", label: "Importer depuis le web", icon: "travel_explore" },
    ],
  },
  {
    group: "Activité",
    items: [
      { href: "/admin/projets", label: "Projets", icon: "folder_open" },
      { href: "/admin/users", label: "Utilisateurs", icon: "group" },
      { href: "/admin/jobs", label: "Jobs IA", icon: "bolt" },
    ],
  },
  {
    group: "Configuration",
    items: [
      { href: "/admin/parametres", label: "Paramètres app", icon: "tune" },
      { href: "/admin/env", label: "Variables .env", icon: "settings" },
    ],
  },
];

export function AdminShell({
  children,
  userEmail,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  userEmail: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <div className="mx-auto flex max-w-[1440px]">
        <AdminSidebar pathname={pathname} userEmail={userEmail} />
        <main className="flex-1 min-w-0 lg:pl-[280px]">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-outline/10 bg-surface/80 px-6 py-4 backdrop-blur-xl">
            <div>
              <motion.h1
                key={title}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="font-headline text-xl font-extrabold tracking-tight"
              >
                {title}
              </motion.h1>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-on-surface-variant">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {action}
              <Link
                href="/"
                className="hidden items-center gap-2 rounded-full border border-outline/20 px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low sm:flex"
              >
                <Icon name="exit_to_app" size={18} />
                Retour site
              </Link>
            </div>
          </header>
          <div className="px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ pathname, userEmail }: { pathname: string; userEmail: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-outline/10 bg-surface-container-lowest px-4 py-6 lg:block">
      <Link
        href="/admin"
        className="flex items-center gap-2 px-3 text-2xl font-black tracking-tighter text-primary"
      >
        UrdeKo
        <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
          Admin
        </span>
      </Link>

      <nav className="mt-8 space-y-6">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-primary-container font-bold text-on-primary-container"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                      ].join(" ")}
                    >
                      {active ? (
                        <motion.span
                          layoutId="admin-nav-indicator"
                          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary"
                        />
                      ) : null}
                      <Icon name={item.icon} size={20} filled={active} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-surface-container-low p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          Connecté
        </p>
        <p className="mt-0.5 truncate text-sm font-bold">{userEmail}</p>
      </div>
    </aside>
  );
}
