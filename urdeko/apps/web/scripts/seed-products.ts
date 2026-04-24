/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";
import { setTimeout as delay } from "node:timers/promises";
import { sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { products as productsTable } from "@/lib/db/schema";

// drizzle-kit charge .env.local avant le schéma ; ici on fait pareil.
// Sans ça, les imports de @/lib/db/client et @/lib/storage exécutent env.ts
// avant que dotenv n'ait rempli process.env → erreur « Required ».
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
process.env.SKIP_ENV_VALIDATION ??= "1";
process.env.S3_REGION ??= "auto";
process.env.S3_FORCE_PATH_STYLE ??= "false";

const SEED_REQUIRED = [
  "DATABASE_URL",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_URL",
] as const;

function assertSeedEnv(): void {
  const missing = SEED_REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `[seed] Variables manquantes : ${missing.join(", ")}.\n` +
        `Renseigne-les dans apps/web/.env.local (ou exporte-les), puis relance.\n` +
        `Le seed n'a besoin que de Postgres + S3, pas de Redis/Gemini/Resend.`,
    );
  }
}

/** Sous-domaines *.localhost : souvent résolus par le navigateur, pas par Node (ENOTFOUND). */
function assertNoSubdomainLocalhost(): void {
  for (const key of ["DATABASE_URL", "S3_ENDPOINT", "S3_PUBLIC_URL"] as const) {
    const raw = process.env[key];
    if (!raw) continue;
    try {
      const { hostname } = new URL(raw);
      if (/^.+\.localhost$/i.test(hostname)) {
        throw new Error(
          `[seed] ${key} utilise l’hôte « ${hostname} » : Node (tsx) ne le résout en général pas → getaddrinfo ENOTFOUND.\n` +
            `Dans apps/web/.env.local, remplace cet hôte par 127.0.0.1 ou localhost ` +
            `(ex. postgresql://urdeko:urdeko@127.0.0.1:55432/urdeko, ` +
            `http://127.0.0.1:59000/… pour MinIO).`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("[seed]")) throw e;
    }
  }
}

// =====================================================================
// Bootstrap catalogue : insère 20 produits curated réels (marques
// marocaines + images libres Pexels) pour que le flow produit fonctionne
// immédiatement après la configuration de Postgres + S3.
//
// Idempotent : chaque produit a un id stable urdeko_bootstrap_<slug>,
// donc relancer la commande met à jour l'enregistrement sans doublon.
// L'image n'est ré-uploadée que si le produit n'existe pas encore.
// =====================================================================

type SeedProduct = {
  slug: string;
  name: string;
  brand: "UrdeKo" | "Kitea" | "Mobilia" | "Autre";
  category:
    | "canape"
    | "table_basse"
    | "tapis"
    | "luminaire"
    | "decoration"
    | "meuble_tv";
  priceMad: number;
  styles: (
    | "moderne"
    | "contemporain"
    | "minimaliste"
    | "japandi"
    | "chaleureux"
    | "elegant"
  )[];
  tags: string[];
  description: string;
  imageUrl: string;
};

const products: SeedProduct[] = [
  // ----- Canapés -----
  {
    slug: "canape_neo_beige",
    name: "Canapé Néo 3 places beige",
    brand: "Kitea",
    category: "canape",
    priceMad: 5900,
    styles: ["moderne", "minimaliste", "contemporain"],
    tags: ["3 places", "tissu", "beige"],
    description:
      "Assise ferme, lignes droites, tissu beige sable. Parfait pour les salons ouverts.",
    imageUrl: "https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg",
  },
  {
    slug: "canape_orion_velours",
    name: "Canapé Orion velours vert",
    brand: "Mobilia",
    category: "canape",
    priceMad: 8400,
    styles: ["elegant", "chaleureux"],
    tags: ["velours", "vert forêt"],
    description: "Velours profond, pieds laiton brossé, dossier capitonné.",
    imageUrl: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg",
  },
  {
    slug: "canape_kumo_japandi",
    name: "Canapé Kumo bois clair",
    brand: "UrdeKo",
    category: "canape",
    priceMad: 6900,
    styles: ["japandi", "minimaliste"],
    tags: ["bois clair", "lin naturel"],
    description:
      "Structure bois naturel, tissu lin ivoire, coussins souples à assise basse.",
    imageUrl: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
  },
  {
    slug: "canape_cosy_terra",
    name: "Canapé Cosy Terra",
    brand: "Kitea",
    category: "canape",
    priceMad: 4200,
    styles: ["chaleureux"],
    tags: ["terracotta", "coussins"],
    description:
      "Canapé enveloppant tissu terracotta, idéal pour un salon familial.",
    imageUrl: "https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg",
  },

  // ----- Tables basses -----
  {
    slug: "table_moon_chene",
    name: "Table basse Moon chêne",
    brand: "UrdeKo",
    category: "table_basse",
    priceMad: 2400,
    styles: ["japandi", "minimaliste", "contemporain"],
    tags: ["ronde", "chêne clair"],
    description:
      "Plateau rond chêne massif, piètement filaire noir mat, finition huilée.",
    imageUrl: "https://images.pexels.com/photos/279719/pexels-photo-279719.jpeg",
  },
  {
    slug: "table_marbre_blanc",
    name: "Table basse Stellar marbre",
    brand: "Mobilia",
    category: "table_basse",
    priceMad: 3800,
    styles: ["elegant", "moderne"],
    tags: ["marbre", "laiton"],
    description: "Plateau marbre blanc veiné, structure laiton — pièce signature.",
    imageUrl: "https://images.pexels.com/photos/447592/pexels-photo-447592.jpeg",
  },
  {
    slug: "table_verre_fume",
    name: "Table basse Verre fumé",
    brand: "Kitea",
    category: "table_basse",
    priceMad: 1900,
    styles: ["moderne", "contemporain"],
    tags: ["verre", "métal noir"],
    description: "Plateau verre fumé, structure acier noir, lignes graphiques.",
    imageUrl: "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg",
  },

  // ----- Tapis -----
  {
    slug: "tapis_azilal",
    name: "Tapis Azilal authentique",
    brand: "UrdeKo",
    category: "tapis",
    priceMad: 4200,
    styles: ["chaleureux", "contemporain"],
    tags: ["Azilal", "laine", "berbère"],
    description:
      "Tapis tissé main dans l'Atlas, laine vierge, motifs abstraits crème et ocre.",
    imageUrl: "https://images.pexels.com/photos/6489217/pexels-photo-6489217.jpeg",
  },
  {
    slug: "tapis_jute_naturel",
    name: "Tapis jute naturel 200x290",
    brand: "Kitea",
    category: "tapis",
    priceMad: 1200,
    styles: ["japandi", "minimaliste", "chaleureux"],
    tags: ["jute", "naturel"],
    description:
      "Grand tapis jute tressé 200×290, ton naturel, idéal pour un salon lumineux.",
    imageUrl: "https://images.pexels.com/photos/6587829/pexels-photo-6587829.jpeg",
  },
  {
    slug: "tapis_lin_graphique",
    name: "Tapis lin graphique",
    brand: "Mobilia",
    category: "tapis",
    priceMad: 2300,
    styles: ["moderne", "contemporain", "elegant"],
    tags: ["lin", "géométrique"],
    description: "Tapis lin tissé serré avec motifs géométriques sobres.",
    imageUrl: "https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg",
  },
  {
    slug: "tapis_terra_beni",
    name: "Tapis Beni Ourain Terra",
    brand: "UrdeKo",
    category: "tapis",
    priceMad: 3600,
    styles: ["chaleureux", "japandi"],
    tags: ["Beni Ourain", "laine", "moelleux"],
    description:
      "Laine épaisse, motifs losanges noirs sur fond crème, fabrication marocaine.",
    imageUrl: "https://images.pexels.com/photos/1571471/pexels-photo-1571471.jpeg",
  },

  // ----- Luminaires -----
  {
    slug: "lampe_zellige_suspension",
    name: "Suspension zellige",
    brand: "UrdeKo",
    category: "luminaire",
    priceMad: 1400,
    styles: ["chaleureux", "elegant"],
    tags: ["zellige", "artisanal"],
    description:
      "Suspension artisanale en zellige vert émeraude, lumière tamisée.",
    imageUrl: "https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg",
  },
  {
    slug: "lampe_arc_laiton",
    name: "Lampadaire arc laiton",
    brand: "Mobilia",
    category: "luminaire",
    priceMad: 2600,
    styles: ["elegant", "moderne"],
    tags: ["lampadaire", "laiton"],
    description:
      "Lampadaire arc en laiton brossé, abat-jour tambour lin.",
    imageUrl: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
  },
  {
    slug: "lampe_papier_japandi",
    name: "Lampe papier japandi",
    brand: "UrdeKo",
    category: "luminaire",
    priceMad: 650,
    styles: ["japandi", "minimaliste"],
    tags: ["papier", "naturel"],
    description:
      "Lampe boule en papier washi sur pied bois clair, ambiance cocon.",
    imageUrl: "https://images.pexels.com/photos/1166644/pexels-photo-1166644.jpeg",
  },
  {
    slug: "lampe_tripode_noir",
    name: "Lampadaire tripode noir",
    brand: "Kitea",
    category: "luminaire",
    priceMad: 890,
    styles: ["contemporain", "moderne"],
    tags: ["tripode", "noir"],
    description:
      "Lampadaire tripode métal noir mat, abat-jour tambour noir.",
    imageUrl: "https://images.pexels.com/photos/1082355/pexels-photo-1082355.jpeg",
  },

  // ----- Décoration -----
  {
    slug: "deco_vase_terre",
    name: "Vase terre cuite grand",
    brand: "UrdeKo",
    category: "decoration",
    priceMad: 450,
    styles: ["chaleureux", "japandi"],
    tags: ["terre cuite", "artisanal"],
    description: "Vase sculpté à la main, terre cuite brute, 45 cm de hauteur.",
    imageUrl: "https://images.pexels.com/photos/4207892/pexels-photo-4207892.jpeg",
  },
  {
    slug: "deco_miroir_rond",
    name: "Miroir rond bois",
    brand: "Mobilia",
    category: "decoration",
    priceMad: 780,
    styles: ["moderne", "minimaliste", "japandi"],
    tags: ["miroir", "bois"],
    description:
      "Miroir rond Ø80, encadrement bois naturel chanfreiné, suspension cordon.",
    imageUrl: "https://images.pexels.com/photos/1248583/pexels-photo-1248583.jpeg",
  },
  {
    slug: "deco_plantes_composition",
    name: "Composition plantes vertes",
    brand: "UrdeKo",
    category: "decoration",
    priceMad: 650,
    styles: ["japandi", "chaleureux", "contemporain"],
    tags: ["plantes", "naturel"],
    description:
      "Trio de plantes d'intérieur (monstera, calathea, pothos) en pots terre.",
    imageUrl: "https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg",
  },

  // ----- Meubles TV -----
  {
    slug: "tv_noyer_suspendu",
    name: "Meuble TV noyer suspendu",
    brand: "UrdeKo",
    category: "meuble_tv",
    priceMad: 3200,
    styles: ["moderne", "contemporain", "japandi"],
    tags: ["noyer", "suspendu"],
    description:
      "Meuble TV 180 cm plaqué noyer, suspendu au mur, tiroirs push-to-open.",
    imageUrl: "https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg",
  },
  {
    slug: "tv_chene_cannage",
    name: "Meuble TV chêne cannage",
    brand: "Mobilia",
    category: "meuble_tv",
    priceMad: 2800,
    styles: ["japandi", "chaleureux", "minimaliste"],
    tags: ["chêne", "cannage"],
    description:
      "Banc TV chêne clair avec portes en cannage naturel, pieds compas.",
    imageUrl: "https://images.pexels.com/photos/1571462/pexels-photo-1571462.jpeg",
  },
];

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "user-agent": "UrdekoSeed/1.0" } });
  if (!res.ok) throw new Error(`Image ${url} unreachable (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

type UploadObjectFn = (typeof import("@/lib/storage"))["uploadObject"];

async function upsert(
  product: SeedProduct,
  db: DB,
  uploadObject: UploadObjectFn,
): Promise<void> {
  const id = `urdeko_bootstrap_${product.slug}`;

  const existing = await db
    .select({ imageKey: productsTable.imageKey, imageUrl: productsTable.imageUrl })
    .from(productsTable)
    .where(sql`${productsTable.id} = ${id}`)
    .limit(1);

  let imageUrl = existing[0]?.imageUrl;
  let imageKey = existing[0]?.imageKey;

  if (!imageUrl || !imageKey) {
    const buffer = await fetchImage(product.imageUrl);
    const uploaded = await uploadObject({
      buffer,
      contentType: "image/jpeg",
      keyPrefix: "catalogue/bootstrap",
      extension: ".jpg",
    });
    imageUrl = uploaded.url;
    imageKey = uploaded.key;
  }

  await db
    .insert(productsTable)
    .values({
      id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      priceMad: product.priceMad,
      imageUrl,
      imageKey,
      styles: product.styles,
      tags: product.tags,
      source: "manual",
      description: product.description,
    })
    .onConflictDoUpdate({
      target: productsTable.id,
      set: {
        name: product.name,
        brand: product.brand,
        category: product.category,
        priceMad: product.priceMad,
        imageUrl,
        imageKey,
        styles: product.styles,
        tags: product.tags,
        source: "manual",
        description: product.description,
        updatedAt: sql`now()`,
      },
    });

  console.info(`  ok ${product.slug} (${product.category}, ${product.priceMad} MAD)`);
}

async function run(): Promise<void> {
  assertSeedEnv();
  assertNoSubdomainLocalhost();
  const [{ db }, { uploadObject }] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/storage"),
  ]);

  console.info(`[seed] Bootstrap catalogue (${products.length} produits)`);
  let ok = 0;
  for (const product of products) {
    try {
      await upsert(product, db, uploadObject);
      ok += 1;
      await delay(150);
    } catch (error) {
      console.warn(`  ko ${product.slug} — ${(error as Error).message}`);
    }
  }
  console.info(`[seed] Terminé : ${ok}/${products.length} produits en place.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
