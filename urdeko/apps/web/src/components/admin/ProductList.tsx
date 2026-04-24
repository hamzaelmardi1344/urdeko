"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@urdeko/design-system";
import type { AdminProduct } from "@/lib/admin/products";
import { ELEMENT_CATEGORIES } from "@/lib/domain";

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "", label: "Toutes catégories" },
  ...ELEMENT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

export function ProductList({
  items,
  total,
  page,
  pageSize,
  category,
  search,
}: {
  items: AdminProduct[];
  total: number;
  page: number;
  pageSize: number;
  category: string;
  search: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, startDelete] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const [error, setError] = useState<string | null>(null);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(items.map((i) => i.id)) : new Set());
  }

  function updateQuery(patch: Record<string, string | number | null>) {
    const params = new URLSearchParams();
    const merged = {
      category,
      search,
      page: String(page),
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== null && v !== "" && v !== undefined) params.set(k, String(v));
    }
    router.push(`/admin/produits?${params.toString()}`);
  }

  function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} produit(s) définitivement ?`)) return;
    setError(null);

    startDelete(async () => {
      try {
        const res = await fetch("/api/admin/products/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected) }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Erreur ${res.status}`);
        }
        setSelected(new Set());
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateQuery({ search: searchDraft, page: 0 });
        }}
        className="flex flex-col gap-3 rounded-2xl border border-outline/10 bg-surface-container-lowest p-4 md:flex-row md:items-center"
      >
        <div className="relative flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded-full border border-outline/20 bg-surface px-12 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => updateQuery({ category: e.target.value, page: 0 })}
          className="rounded-full border border-outline/20 bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id || "all"} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
        >
          Filtrer
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3 text-sm">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={items.length > 0 && selected.size === items.length}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <span className="font-bold">
            {selected.size === 0
              ? `${total.toLocaleString("fr-MA")} produits au total`
              : `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`}
          </span>
        </label>
        <AnimatePresence>
          {selected.size > 0 ? (
            <motion.button
              key="del"
              type="button"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-full bg-error px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              {deleting ? (
                <Icon name="progress_activity" size={16} className="animate-spin" />
              ) : (
                <Icon name="delete" size={16} />
              )}
              Supprimer la sélection
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {error ? (
        <div className="rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-10 text-center">
          <Icon name="inventory_2" size={32} className="text-on-surface-variant" />
          <p className="mt-3 font-bold">Aucun produit</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Importe depuis le web ou seed le catalogue (`pnpm db:seed`).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline/10">
          <table className="w-full border-collapse bg-surface-container-lowest text-sm">
            <thead className="bg-surface-container-low text-left text-xs uppercase tracking-widest text-on-surface-variant/70">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3">Produit</th>
                <th className="p-3">Marque</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Prix</th>
                <th className="p-3">Source</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className={[
                    "border-t border-outline/5 transition-colors",
                    selected.has(p.id)
                      ? "bg-primary-container/10"
                      : "hover:bg-surface-container-low",
                  ].join(" ")}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          loading="lazy"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container">
                          <Icon name="image" size={20} className="text-on-surface-variant" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="truncate text-xs text-on-surface-variant">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-on-surface-variant">{p.brand}</td>
                  <td className="p-3">
                    {p.category ? (
                      <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-xs font-bold text-on-primary-container">
                        {ELEMENT_CATEGORIES.find((c) => c.id === p.category)?.label ??
                          p.category}
                      </span>
                    ) : (
                      <span className="text-xs italic text-on-surface-variant/70">
                        non classé
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-bold tabular-nums">
                    {p.priceMad.toLocaleString("fr-MA")} MAD
                  </td>
                  <td className="p-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        p.source === "scraped"
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-emerald-500/15 text-emerald-700",
                      ].join(" ")}
                    >
                      {p.source === "scraped" ? "Scrapé" : "Manuel"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {p.sourceUrl ? (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        <Icon name="open_in_new" size={14} className="inline align-[-3px]" />
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 text-sm">
          <span className="text-on-surface-variant">
            Page {page + 1} / {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => updateQuery({ page: page - 1 })}
              className="rounded-full border border-outline/20 px-4 py-1.5 font-bold disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => updateQuery({ page: page + 1 })}
              className="rounded-full border border-outline/20 px-4 py-1.5 font-bold disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
