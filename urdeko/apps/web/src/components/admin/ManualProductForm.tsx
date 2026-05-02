"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Icon, cn } from "@urdeko/design-system";
import { ELEMENT_CATEGORIES, STYLES } from "@/lib/domain";

type ManualProductInitial = {
  id?: string;
  name: string;
  brand: string;
  category: string | null;
  priceMad: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  styles: string[];
  tags: string[];
  description: string | null;
};

type Suggestion = {
  category: string | null;
  styles: string[];
  tags: string[];
  description: string;
};

const fieldClass =
  "w-full rounded-xl border border-outline/20 bg-surface px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:shadow-glow-sm";
const labelClass =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70";

export function ManualProductForm({
  mode,
  initial,
  duplicateFrom,
}: {
  mode: "create" | "edit" | "duplicate";
  initial?: ManualProductInitial | null;
  duplicateFrom?: string | null;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [prefilling, startPrefilling] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [priceMad, setPriceMad] = useState(String(initial?.priceMad ?? ""));
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [styles, setStyles] = useState<Set<string>>(new Set(initial?.styles ?? []));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewUrl = useMemo(() => {
    if (filePreview) return filePreview;
    if (imageUrl.trim()) return imageUrl.trim();
    return initial?.imageUrl ?? null;
  }, [filePreview, imageUrl, initial?.imageUrl]);

  function toggleStyle(style: string) {
    const next = new Set(styles);
    if (next.has(style)) next.delete(style);
    else next.add(style);
    setStyles(next);
  }

  function buildFormData() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("brand", brand);
    formData.set("category", category);
    formData.set("priceMad", priceMad);
    formData.set("sourceUrl", sourceUrl);
    formData.set("description", description);
    formData.set("tags", tags);
    styles.forEach((style) => formData.append("styles", style));
    if (imageFile) formData.set("imageFile", imageFile);
    else if (imageUrl.trim()) formData.set("imageUrl", imageUrl.trim());
    if (initial?.imageUrl) formData.set("existingImageUrl", initial.imageUrl);
    if (duplicateFrom) formData.set("duplicateFrom", duplicateFrom);
    return formData;
  }

  function handlePrefill() {
    setError(null);
    setNotice(null);
    setSuggestion(null);
    if (!name.trim() || !brand.trim()) {
      setError("Renseigne au moins le nom et la marque avant le préremplissage IA.");
      return;
    }

    startPrefilling(async () => {
      try {
        const res = await fetch("/api/admin/products/manual/prefill", {
          method: "POST",
          body: buildFormData(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message ?? data.error ?? `Erreur ${res.status}`);
        }
        setSuggestion(data.suggestion as Suggestion);
        setNotice("Suggestions prêtes. Vérifie puis applique ce qui convient.");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function applySuggestion() {
    if (!suggestion) return;
    if (suggestion.category) setCategory(suggestion.category);
    setStyles(new Set(suggestion.styles));
    setTags(suggestion.tags.join(", "));
    if (suggestion.description) setDescription(suggestion.description);
    setNotice("Suggestions appliquées au brouillon. Tu peux encore ajuster avant sauvegarde.");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode !== "edit" && !imageFile && !imageUrl.trim() && !duplicateFrom) {
      setError("Ajoute une image par upload ou par URL directe.");
      return;
    }

    startSaving(async () => {
      try {
        const endpoint =
          mode === "edit" && initial?.id
            ? `/api/admin/products/manual/${encodeURIComponent(initial.id)}`
            : "/api/admin/products/manual";
        const res = await fetch(endpoint, {
          method: mode === "edit" ? "PATCH" : "POST",
          body: buildFormData(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const issue = data.issues?.[0]?.message;
          throw new Error(issue ?? data.message ?? data.error ?? `Erreur ${res.status}`);
        }
        const productId = data.product?.id;
        router.push(`/admin/produits?search=${encodeURIComponent(productId ?? name)}`);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const title =
    mode === "edit"
      ? "Modifier le produit"
      : mode === "duplicate"
        ? "Dupliquer ce produit"
        : "Nouveau produit manuel";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5 rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
        <div>
          <h2 className="font-headline text-lg font-extrabold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Les produits sauvegardés ici sont immédiatement disponibles dans le catalogue.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-error/25 bg-error/5 p-3 text-sm text-error">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom du produit">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
              placeholder="Canapé droit lin naturel"
            />
          </Field>
          <Field label="Marque">
            <input
              required
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={fieldClass}
              placeholder="UrdeKo, Kitea, Mobilia..."
            />
          </Field>
          <Field label="Prix MAD">
            <input
              required
              type="number"
              min={1}
              step={1}
              value={priceMad}
              onChange={(event) => setPriceMad(event.target.value)}
              className={fieldClass}
              placeholder="12990"
            />
          </Field>
          <Field label="Catégorie">
            <select
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={fieldClass}
            >
              <option value="">Sélectionner une catégorie</option>
              {ELEMENT_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={cn(fieldClass, "min-h-28 resize-y")}
            placeholder="Phrase courte utilisée par le catalogue et l'IA."
          />
        </Field>

        <Field label="Styles">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((style) => {
              const active = styles.has(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleStyle(style.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Tags">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className={fieldClass}
              placeholder="lin, beige, bois clair"
            />
          </Field>
          <Field label="URL source / boutique">
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className={fieldClass}
              placeholder="https://..."
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-outline/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/produits"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-outline/20 px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="arrow_back" size={18} />
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-glow-sm transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <Icon name="save" size={18} />
            )}
            {mode === "edit" ? "Enregistrer les modifications" : "Ajouter au catalogue"}
          </button>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <h3 className="font-headline text-base font-extrabold">Image produit</h3>
          <div className="mt-4 overflow-hidden rounded-2xl bg-surface-container">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-on-surface-variant">
                <Icon name="image" size={34} />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Upload fichier">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                  if (event.target.files?.[0]) setImageUrl("");
                }}
                className="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-on-primary"
              />
            </Field>
            <Field label="Ou URL directe image">
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (event.target.value) setImageFile(null);
                }}
                className={fieldClass}
                placeholder="https://cdn.site.com/image.jpg"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/40 text-primary">
              <Icon name="auto_awesome" size={20} filled />
            </span>
            <div>
              <h3 className="font-headline text-base font-extrabold">
                Préremplissage IA
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Gemini propose catégorie, styles, tags et description. Tu gardes la main.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrefill}
            disabled={prefilling || !name || !brand}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary-container/20 px-4 py-2.5 text-sm font-bold text-primary transition-opacity disabled:opacity-50"
          >
            {prefilling ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <Icon name="auto_awesome" size={18} />
            )}
            Préremplir avec IA
          </button>

          {suggestion ? (
            <div className="mt-4 space-y-3 rounded-xl bg-surface p-3 text-sm">
              <p>
                <strong>Catégorie :</strong>{" "}
                {ELEMENT_CATEGORIES.find((c) => c.id === suggestion.category)?.label ??
                  "Non détectée"}
              </p>
              <p>
                <strong>Styles :</strong>{" "}
                {suggestion.styles.length ? suggestion.styles.join(", ") : "Aucun"}
              </p>
              <p>
                <strong>Tags :</strong>{" "}
                {suggestion.tags.length ? suggestion.tags.join(", ") : "Aucun"}
              </p>
              {suggestion.description ? (
                <p className="text-on-surface-variant">{suggestion.description}</p>
              ) : null}
              <button
                type="button"
                onClick={applySuggestion}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary"
              >
                <Icon name="check" size={16} />
                Appliquer ces suggestions
              </button>
            </div>
          ) : null}
        </section>

        {initial?.id ? (
          <section className="rounded-2xl border border-outline/10 bg-surface-container-lowest p-4 text-xs text-on-surface-variant">
            <p className="font-bold text-on-surface">ID interne</p>
            <code className="mt-1 block break-all">{initial.id}</code>
          </section>
        ) : null}
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
