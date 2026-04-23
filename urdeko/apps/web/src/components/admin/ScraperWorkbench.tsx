"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@urdeko/design-system";
import { ELEMENT_CATEGORIES, STYLES, type ElementCategoryId } from "@/lib/domain";
import type { DetectionResult, ExtractedProduct } from "@/lib/scraper/types";

type ImportSummary = {
  imported: number;
  skipped: number;
  errors: Array<{ externalId: string; message: string }>;
};

const EXAMPLES = [
  {
    label: "Ambiance Design (WooCommerce)",
    url: "https://ambiance-design.ma/boutique/",
  },
  {
    label: "Ambiance Design — Canapé BELLONA (produit)",
    url: "https://ambiance-design.ma/canape-dangle-bellona/",
  },
  {
    label: "Kitea — Canapés",
    url: "https://www.kitea.com/par-espaces/salon-et-sejour/canapes-et-sofas.html",
  },
];

const CATEGORY_LABELS: Record<ElementCategoryId, string> = Object.fromEntries(
  ELEMENT_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<ElementCategoryId, string>;

export function ScraperWorkbench() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExtractedProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detecting, startDetect] = useTransition();
  const [importing, startImport] = useTransition();
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleDetect(target?: string) {
    const target2 = (target ?? url).trim();
    if (!target2) return;
    setUrl(target2);
    setDetectError(null);
    setSummary(null);
    setImportError(null);
    setResult(null);
    setDraft([]);
    setSelected(new Set());

    startDetect(async () => {
      try {
        const res = await fetch("/api/admin/scrape/detect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: target2 }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Erreur ${res.status}`);
        }
        const data = (await res.json()) as DetectionResult;
        setResult(data);
        setDraft(data.products);
        setSelected(new Set(data.products.map((p) => p.externalId)));
      } catch (err) {
        setDetectError((err as Error).message);
      }
    });
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll(checked: boolean) {
    setSelected(checked ? new Set(draft.map((p) => p.externalId)) : new Set());
  }

  function updateProduct(id: string, patch: Partial<ExtractedProduct>) {
    setDraft((prev) =>
      prev.map((p) => (p.externalId === id ? { ...p, ...patch } : p)),
    );
  }

  function toggleStyle(id: string, style: string) {
    setDraft((prev) =>
      prev.map((p) => {
        if (p.externalId !== id) return p;
        const has = p.styles.includes(style);
        return {
          ...p,
          styles: has
            ? p.styles.filter((s) => s !== style)
            : [...p.styles, style],
        };
      }),
    );
  }

  function handleImport() {
    const toSend = draft.filter((p) => selected.has(p.externalId));
    if (toSend.length === 0) return;

    setImportError(null);
    setSummary(null);
    startImport(async () => {
      try {
        const res = await fetch("/api/admin/scrape/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ products: toSend }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Erreur ${res.status}`);
        }
        const data = (await res.json()) as ImportSummary;
        setSummary(data);
        if (data.imported > 0) {
          // on garde uniquement les produits non-importés pour retry
          const importedIds = new Set(
            toSend
              .filter((_, i) => i < data.imported)
              .map((p) => p.externalId),
          );
          setSelected(new Set());
          setDraft((prev) => prev.filter((p) => !importedIds.has(p.externalId)));
        }
      } catch (err) {
        setImportError((err as Error).message);
      }
    });
  }

  const hasDraft = draft.length > 0;
  const selectedCount = selected.size;
  const allSelected = hasDraft && selectedCount === draft.length;

  return (
    <div className="space-y-6">
      <URLForm
        url={url}
        onChange={setUrl}
        onDetect={() => handleDetect()}
        detecting={detecting}
        examples={EXAMPLES}
        onPickExample={(u) => handleDetect(u)}
      />

      <AnimatePresence mode="wait">
        {detectError ? (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm"
          >
            <Icon name="error" size={20} className="shrink-0 text-error" />
            <div>
              <p className="font-bold text-error">Impossible d'analyser cette URL</p>
              <p className="mt-0.5 text-on-surface-variant">{detectError}</p>
            </div>
          </motion.div>
        ) : null}

        {summary ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
          >
            <Icon name="check_circle" size={20} className="shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-700">
                {summary.imported} produit{summary.imported > 1 ? "s" : ""} importé
                {summary.imported > 1 ? "s" : ""} dans Sanity.
              </p>
              <p className="mt-0.5 text-on-surface-variant">
                {summary.skipped} ignoré · {summary.errors.length} erreur
                {summary.errors.length > 1 ? "s" : ""}.
              </p>
              {summary.errors.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-on-surface-variant">
                    Voir les erreurs
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
                    {summary.errors.map((e) => (
                      <li key={e.externalId}>
                        <code>{e.externalId}</code> : {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {importError ? (
          <motion.div
            key="imperr"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-error"
          >
            Erreur import : {importError}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {result ? <DetectionBanner result={result} /> : null}

      {hasDraft ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={allSelected}
                onChange={(e) => selectAll(e.target.checked)}
              />
              <span className="font-bold">
                {selectedCount} / {draft.length} sélectionné
                {selectedCount > 1 ? "s" : ""}
              </span>
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary shadow-glow-sm transition-opacity disabled:opacity-40"
            >
              {importing ? (
                <>
                  <Icon name="progress_activity" size={18} className="animate-spin" />
                  Import en cours…
                </>
              ) : (
                <>
                  <Icon name="cloud_upload" size={18} />
                  Importer la sélection
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {draft.map((p) => (
              <ProductCard
                key={p.externalId}
                product={p}
                selected={selected.has(p.externalId)}
                onToggle={() => toggle(p.externalId)}
                onChange={(patch) => updateProduct(p.externalId, patch)}
                onToggleStyle={(s) => toggleStyle(p.externalId, s)}
              />
            ))}
          </div>
        </>
      ) : result && result.products.length === 0 ? (
        <div className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-6 text-center">
          <Icon name="search_off" size={32} className="text-on-surface-variant" />
          <p className="mt-3 font-bold">Aucun produit détecté sur cette page</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Essaie une URL de page produit directement, ou une URL de catégorie listant
            plusieurs produits.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function URLForm({
  url,
  onChange,
  onDetect,
  detecting,
  examples,
  onPickExample,
}: {
  url: string;
  onChange: (v: string) => void;
  onDetect: () => void;
  detecting: boolean;
  examples: Array<{ label: string; url: string }>;
  onPickExample: (u: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
      <div className="mb-4">
        <h2 className="font-headline text-lg font-extrabold tracking-tight">
          Importer depuis n'importe quelle boutique
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Colle l'URL d'une page produit ou d'une page catégorie. On extrait le JSON-LD /
          OpenGraph / et si besoin, Gemini fait le boulot. Tu valides avant import.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onDetect();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Icon
            name="link"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="url"
            required
            placeholder="https://boutique.ma/categorie/canapes"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-full border border-outline/20 bg-surface px-12 py-3 text-sm outline-none transition-all focus:border-primary focus:shadow-glow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={detecting || !url}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-glow-sm transition-opacity disabled:opacity-40"
        >
          {detecting ? (
            <>
              <Icon name="progress_activity" size={18} className="animate-spin" />
              Analyse…
            </>
          ) : (
            <>
              <Icon name="travel_explore" size={18} />
              Analyser
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
          Exemples :
        </span>
        {examples.map((ex) => (
          <button
            key={ex.url}
            type="button"
            onClick={() => onPickExample(ex.url)}
            disabled={detecting}
            className="rounded-full border border-outline/20 bg-surface px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary-container/30 disabled:opacity-50"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function DetectionBanner({ result }: { result: DetectionResult }) {
  const source: Record<DetectionResult["source"], { label: string; icon: string; tint: string }> = {
    jsonld: { label: "JSON-LD schema.org", icon: "verified", tint: "bg-emerald-500/10 text-emerald-700" },
    opengraph: { label: "OpenGraph fallback", icon: "shield", tint: "bg-amber-500/10 text-amber-700" },
    heuristic: { label: "Détection CMS", icon: "auto_awesome", tint: "bg-primary-container/40 text-on-primary-container" },
    gemini: { label: "IA Gemini", icon: "auto_awesome", tint: "bg-primary-container/40 text-on-primary-container" },
  };
  const s = source[result.source];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-4 text-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tint}`}>
          <Icon name={s.icon} size={18} filled />
        </span>
        <div>
          <p className="font-bold">
            {result.products.length} produit{result.products.length > 1 ? "s" : ""} détecté
            {result.products.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-on-surface-variant">
            Source : {s.label} · Type :{" "}
            {result.pageType === "product"
              ? "Page produit"
              : result.pageType === "listing"
                ? "Page catégorie"
                : "Inconnu"}
          </p>
        </div>
      </div>
      {result.warnings.length > 0 ? (
        <details className="text-xs text-on-surface-variant">
          <summary className="cursor-pointer">
            {result.warnings.length} avertissement{result.warnings.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 max-w-md space-y-1 pl-4">
            {result.warnings.map((w, i) => (
              <li key={i} className="list-disc">
                {w}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onToggle,
  onChange,
  onToggleStyle,
}: {
  product: ExtractedProduct;
  selected: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ExtractedProduct>) => void;
  onToggleStyle: (style: string) => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "group flex flex-col overflow-hidden rounded-2xl border bg-surface-container-lowest transition-all",
        selected
          ? "border-primary shadow-glow-sm"
          : "border-outline/10 hover:border-outline/30",
      ].join(" ")}
    >
      <div className="relative aspect-[4/3] bg-surface-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <label className="absolute left-3 top-3 flex cursor-pointer items-center gap-2 rounded-full bg-surface-container-lowest/90 px-3 py-1.5 backdrop-blur">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-xs font-bold">
            {selected ? "Sélectionné" : "Ignorer"}
          </span>
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
            {product.brand}
          </p>
          <h3 className="line-clamp-2 mt-0.5 font-headline text-base font-extrabold leading-tight">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              value={product.priceMad}
              onChange={(e) => onChange({ priceMad: Number(e.target.value) || 0 })}
              className="w-24 rounded-md border border-outline/20 bg-surface px-2 py-1 text-sm font-bold tabular-nums outline-none focus:border-primary"
            />
            <span className="text-sm font-bold text-on-surface-variant">MAD</span>
          </div>
          {product.currency && product.currency !== "MAD" ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              converti depuis {product.currency}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
            Catégorie UrdeKo
          </label>
          <select
            value={product.category ?? ""}
            onChange={(e) =>
              onChange({
                category: (e.target.value || null) as ElementCategoryId | null,
              })
            }
            className="rounded-md border border-outline/20 bg-surface px-2 py-1 text-sm outline-none focus:border-primary"
          >
            <option value="">— Non classé —</option>
            {ELEMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {CATEGORY_LABELS[c.id]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
            Styles détectés
          </label>
          <div className="flex flex-wrap gap-1">
            {STYLES.map((s) => {
              const on = product.styles.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleStyle(s.id)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
                    on
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-auto flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <Icon name="open_in_new" size={14} />
          Voir la source
        </a>
      </div>
    </motion.article>
  );
}
