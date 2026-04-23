import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

// ============================================================
// Feature flags / quotas / seuils — stockés en DB, éditables
// depuis /admin/parametres. Chaque setting a une valeur typée
// par défaut utilisée quand la clé n'existe pas (= boot neuf).
// ============================================================

export type SettingDef<T> = {
  key: string;
  label: string;
  description: string;
  kind: "boolean" | "number" | "string" | "json";
  defaultValue: T;
  group: "ia" | "catalogue" | "quotas" | "flags" | "autre";
};

export const SETTINGS = {
  // ----- IA / génération ----------------------------------
  ia_empty_room_enabled: {
    key: "ia_empty_room_enabled",
    label: "Activer « vider la pièce »",
    description: "Désactive temporairement l'étape Gemini empty room si besoin.",
    kind: "boolean",
    defaultValue: true,
    group: "ia",
  } satisfies SettingDef<boolean>,
  ia_max_edge_px: {
    key: "ia_max_edge_px",
    label: "Taille max côté IA (px)",
    description: "Plus grande arête des photos envoyées à Gemini.",
    kind: "number",
    defaultValue: 1536,
    group: "ia",
  } satisfies SettingDef<number>,
  ia_generations_per_hour: {
    key: "ia_generations_per_hour",
    label: "Quota IA / heure / utilisateur",
    description: "Nombre d'appels Gemini autorisés par heure par utilisateur.",
    kind: "number",
    defaultValue: 20,
    group: "quotas",
  } satisfies SettingDef<number>,

  // ----- Catalogue / produits -----------------------------
  catalogue_default_budget_mad: {
    key: "catalogue_default_budget_mad",
    label: "Budget projet par défaut (MAD)",
    description: "Valeur initiale du curseur budget sur un nouveau projet.",
    kind: "number",
    defaultValue: 15000,
    group: "catalogue",
  } satisfies SettingDef<number>,
  catalogue_flexibility_pct: {
    key: "catalogue_flexibility_pct",
    label: "Flexibilité budget (%)",
    description: "Tolérance autour du budget pour scorer les produits.",
    kind: "number",
    defaultValue: 10,
    group: "catalogue",
  } satisfies SettingDef<number>,

  // ----- Feature flags ------------------------------------
  flag_marketing_banner: {
    key: "flag_marketing_banner",
    label: "Bannière marketing accueil",
    description: "Affiche la bannière promo en haut de la landing.",
    kind: "boolean",
    defaultValue: false,
    group: "flags",
  } satisfies SettingDef<boolean>,
  flag_public_catalogue: {
    key: "flag_public_catalogue",
    label: "Catalogue public /inspiration",
    description: "Rend la page inspiration accessible sans compte.",
    kind: "boolean",
    defaultValue: true,
    group: "flags",
  } satisfies SettingDef<boolean>,
} as const satisfies Record<string, SettingDef<unknown>>;

export type SettingKey = keyof typeof SETTINGS;

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<(typeof SETTINGS)[K]["defaultValue"]> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  if (!row) return SETTINGS[key].defaultValue as (typeof SETTINGS)[K]["defaultValue"];
  return row.value as (typeof SETTINGS)[K]["defaultValue"];
}

export async function getAllSettings(): Promise<
  Array<{ def: SettingDef<unknown>; value: unknown; stored: boolean; updatedAt: Date | null }>
> {
  const rows = await db.select().from(appSettings);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Object.values(SETTINGS).map((def) => {
    const stored = byKey.get(def.key);
    return {
      def,
      value: stored?.value ?? def.defaultValue,
      stored: Boolean(stored),
      updatedAt: stored?.updatedAt ?? null,
    };
  });
}

export async function setSetting(
  key: SettingKey,
  value: unknown,
  userId: string | null = null,
): Promise<void> {
  const def = SETTINGS[key];
  const parsed = coerce(def.kind, value);
  await db
    .insert(appSettings)
    .values({
      key,
      value: parsed,
      description: def.description,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: parsed, updatedAt: new Date(), updatedBy: userId },
    });
}

function coerce(kind: SettingDef<unknown>["kind"], raw: unknown): unknown {
  switch (kind) {
    case "boolean":
      return raw === true || raw === "true" || raw === "on" || raw === 1 || raw === "1";
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) throw new Error("Valeur numérique invalide");
      return n;
    }
    case "string":
      return String(raw ?? "");
    case "json":
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          throw new Error("JSON invalide");
        }
      }
      return raw;
  }
}
