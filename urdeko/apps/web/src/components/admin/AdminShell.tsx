"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@urdeko/design-system";
import { useState, type ReactNode } from "react";
import type { BackofficeRole } from "@/lib/admin/auth";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  roles?: BackofficeRole[];
};

type NavGroup = {
  group: string;
  items: NavItem[];
  roles?: BackofficeRole[];
};

const NAV: NavGroup[] = [
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
      { href: "/admin/produits/nouveau", label: "Ajouter manuellement", icon: "add_box" },
      { href: "/admin/produits/scraper", label: "Importer depuis le web", icon: "travel_explore" },
    ],
  },
  {
    group: "Activité",
    items: [
      { href: "/admin/projets", label: "Projets", icon: "folder_open" },
      { href: "/admin/users", label: "Utilisateurs", icon: "group", roles: ["super_admin"] },
      { href: "/admin/jobs", label: "Jobs IA", icon: "bolt" },
    ],
    roles: ["super_admin"],
  },
  {
    group: "Configuration",
    items: [
      { href: "/admin/parametres", label: "Paramètres app", icon: "tune" },
      { href: "/admin/env", label: "Variables .env", icon: "settings" },
    ],
    roles: ["super_admin"],
  },
];

export function AdminShell({
  children,
  userEmail,
  role,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  userEmail: string;
  role: BackofficeRole;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navGroups = navGroupsForRole(role);
  const handleSignOut = () => {
    void signOut({ redirectTo: "/admin/connexion" });
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-surface text-on-surface">
      <div className="mx-auto flex max-w-[1440px]">
        <AdminSidebar
          pathname={pathname}
          userEmail={userEmail}
          role={role}
          navGroups={navGroups}
          onSignOut={handleSignOut}
        />
        <MobileAdminDrawer
          open={menuOpen}
          pathname={pathname}
          userEmail={userEmail}
          role={role}
          navGroups={navGroups}
          onClose={() => setMenuOpen(false)}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 min-w-0 lg:pl-[280px]">
          <header className="sticky top-0 z-30 border-b border-outline/10 bg-surface/90 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline/15 bg-surface-container-lowest text-on-surface shadow-sm lg:hidden"
                  aria-label="Ouvrir le menu admin"
                >
                  <Icon name="menu" size={22} />
                </button>
                <div className="min-w-0">
                  <motion.h1
                    key={title}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="truncate font-headline text-lg font-extrabold tracking-tight sm:text-xl"
                  >
                    {title}
                  </motion.h1>
                  {subtitle ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant sm:text-sm">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                {action}
                <Link
                  href="/"
                  className="hidden items-center gap-2 rounded-full border border-outline/20 px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low md:flex"
                >
                  <Icon name="exit_to_app" size={18} />
                  Retour site
                </Link>
              </div>
            </div>
            {action ? (
              <div className="border-t border-outline/10 px-4 py-3 sm:hidden">
                <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                  {action}
                </div>
              </div>
            ) : null}
            <MobileQuickNav pathname={pathname} navGroups={navGroups} />
          </header>
          <div className="px-4 py-5 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, item: NavItem): boolean {
  return (
    pathname === item.href ||
    (item.href !== "/admin" &&
      item.href !== "/admin/produits" &&
      pathname.startsWith(item.href))
  );
}

function navGroupsForRole(role: BackofficeRole) {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter(
    (group) => group.items.length > 0 && (!group.roles || group.roles.includes(role)),
  );
}

function allNavItems(navGroups: NavGroup[]): NavItem[] {
  return navGroups.flatMap((group) => group.items);
}

function roleLabel(role: BackofficeRole): string {
  return role === "super_admin" ? "Super admin" : "Partenaire";
}

function AdminSidebar({
  pathname,
  userEmail,
  role,
  navGroups,
  onSignOut,
}: {
  pathname: string;
  userEmail: string;
  role: BackofficeRole;
  navGroups: NavGroup[];
  onSignOut: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-outline/10 bg-surface-container-lowest px-4 py-6 lg:block">
      <AdminBrand />

      <AdminNavGroups
        pathname={pathname}
        navGroups={navGroups}
        indicatorLayoutId="admin-nav-indicator-desktop"
      />

      <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-surface-container-low p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          Connecté
        </p>
        <p className="mt-0.5 truncate text-sm font-bold">{userEmail}</p>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant">{roleLabel(role)}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-error/10 hover:text-error"
        >
          <Icon name="logout" size={17} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

function AdminBrand() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 px-3 text-2xl font-black tracking-tighter text-primary"
    >
      UrdeKo
      <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
        Admin
      </span>
    </Link>
  );
}

function AdminNavGroups({
  pathname,
  navGroups,
  onNavigate,
  indicatorLayoutId,
}: {
  pathname: string;
  navGroups: NavGroup[];
  onNavigate?: () => void;
  indicatorLayoutId?: string;
}) {
  return (
    <nav className="mt-8 space-y-6">
      {navGroups.map((group) => (
        <div key={group.group}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">
            {group.group}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary-container font-bold text-on-primary-container"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                    ].join(" ")}
                  >
                    {active && indicatorLayoutId ? (
                      <motion.span
                        layoutId={indicatorLayoutId}
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
  );
}

function MobileQuickNav({
  pathname,
  navGroups,
}: {
  pathname: string;
  navGroups: NavGroup[];
}) {
  return (
    <nav className="lg:hidden border-t border-outline/10 px-4 py-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {allNavItems(navGroups).map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors",
                active
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest text-on-surface-variant",
              ].join(" ")}
            >
              <Icon name={item.icon} size={16} filled={active} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileAdminDrawer({
  open,
  pathname,
  userEmail,
  role,
  navGroups,
  onClose,
  onSignOut,
}: {
  open: boolean;
  pathname: string;
  userEmail: string;
  role: BackofficeRole;
  navGroups: NavGroup[];
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Fermer le menu admin"
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            aria-label="Menu admin mobile"
            className="fixed inset-y-0 left-0 z-50 flex w-[calc(100vw-32px)] max-w-[360px] flex-col border-r border-outline/10 bg-surface-container-lowest px-4 py-5 shadow-2xl lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-center justify-between gap-3">
              <AdminBrand />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
                aria-label="Fermer le menu admin"
              >
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <AdminNavGroups
                pathname={pathname}
                navGroups={navGroups}
                onNavigate={onClose}
              />
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                Connecté
              </p>
              <p className="mt-0.5 truncate text-sm font-bold">{userEmail}</p>
              <p className="mt-1 text-xs font-semibold text-on-surface-variant">{roleLabel(role)}</p>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2 text-sm font-bold text-on-surface"
              >
                <Icon name="logout" size={17} />
                Se déconnecter
              </button>
              <Link
                href="/"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-outline/15 px-3 py-2 text-sm font-bold text-on-surface-variant"
              >
                <Icon name="exit_to_app" size={17} />
                Retour site
              </Link>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
