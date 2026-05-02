import { GoogleGenAI, Modality, type Part } from "@google/genai";
import sharp from "sharp";
import { z } from "zod";
import { env } from "@/env";

// =====================================================================
// Wrapper Gemini : 2.5 Pro (texte/analyse) + 2.5 Flash Image (édition).
// La clé est requise (validée dans env.ts) — aucun fallback.
// =====================================================================

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Gemini 2.5 Flash Image requiert explicitement TEXT + IMAGE dans
// `responseModalities` pour générer une image éditée — un seul mode
// IMAGE renvoie souvent une image quasi-identique à l'entrée (« no-op »).
const IMAGE_MODALITIES = [Modality.TEXT, Modality.IMAGE] as const;

// Toutes les photos sont redimensionnées (et ré-encodées en JPEG qualité 90)
// avant envoi à Gemini : la plus grande arête est limitée à AI_IMAGE_MAX_EDGE.
// C'est la recette qui marche bien avec Flash Image — au-delà de ~1500 px le
// modèle devient conservateur et hésite à modifier la scène en profondeur.
async function downscaleForGemini(input: Buffer): Promise<{ bytes: Buffer; mime: string }> {
  const max = env.AI_IMAGE_MAX_EDGE;
  const bytes = await sharp(input)
    .rotate() // applique l'orientation EXIF (sinon iPhone = photo couchée)
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { bytes, mime: "image/jpeg" };
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Impossible de récupérer l'image ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchImageAsInlinePart(url: string): Promise<Part> {
  const raw = await fetchImageBytes(url);
  const { bytes, mime } = await downscaleForGemini(raw);
  return {
    inlineData: {
      data: bytes.toString("base64"),
      mimeType: mime,
    },
  } as Part;
}

// ------------------------------------------------------------------
// 1. Analyse photo (Gemini 2.5 Pro, sortie JSON)
// ------------------------------------------------------------------

export type PhotoAnalysis = {
  valid: boolean;
  reasons: string[];
  detected: {
    roomType: string | null;
    lighting: "bonne" | "sombre" | "contrejour" | "moyenne";
    framing: "correct" | "trop_proche" | "trop_loin" | "coupe";
    clutter: "faible" | "moyen" | "eleve";
  };
  advice: string;
};

const photoAnalysisSchema: z.ZodType<PhotoAnalysis> = z.object({
  valid: z.boolean(),
  reasons: z.array(z.string()),
  detected: z.object({
    roomType: z
      .enum(["salon", "chambre", "salle_a_manger", "bureau", "espace_jardin"])
      .nullable(),
    lighting: z.enum(["bonne", "sombre", "contrejour", "moyenne"]),
    framing: z.enum(["correct", "trop_proche", "trop_loin", "coupe"]),
    clutter: z.enum(["faible", "moyen", "eleve"]),
  }),
  advice: z.string(),
});

export async function analyzePhoto(imageUrl: string): Promise<PhotoAnalysis> {
  const prompt = `Tu es un expert en aménagement d'intérieur. Analyse l'image fournie et réponds UNIQUEMENT par un JSON valide :
{
  "valid": boolean, // true si la photo permet une bonne transformation
  "reasons": string[], // raisons en français si non valide, sinon []
  "detected": {
    "roomType": "salon" | "chambre" | "salle_a_manger" | "bureau" | "espace_jardin" | null,
    "lighting": "bonne" | "sombre" | "contrejour" | "moyenne",
    "framing": "correct" | "trop_proche" | "trop_loin" | "coupe",
    "clutter": "faible" | "moyen" | "eleve"
  },
  "advice": string // conseil court en français pour améliorer le cadrage si besoin
}`;

  const image = await fetchImageAsInlinePart(imageUrl);
  const response = await ai.models.generateContent({
    model: env.GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }, image] }],
    config: { responseMimeType: "application/json" },
  });

  return parseGeminiJson(response.text, photoAnalysisSchema, "analyse photo");
}

// ------------------------------------------------------------------
// 2. Vider la pièce (Gemini 2.5 Flash Image, 1 appel)
// ------------------------------------------------------------------

// Flash Image : on force une **édition** de la photo fournie, pas une
// « génération » d’une nouvelle pièce. Image en premier + température basse
// + prompt très négatif réduit les cas où le modèle invente un autre espace.

const EMPTY_ROOM_EDIT_PROMPT = `You are performing a STRICT SINGLE-IMAGE PHOTO EDIT on the attached interior photograph. This is NOT a creative redesign and NOT a new room — the output must be immediately recognizable as the same physical space as the input.

IMMUTABLE (do not change in any way):
- Camera position, focal length, field of view, horizon line, vanishing points, crop, rotation, and aspect ratio
- Geometry and layout of walls, ceiling, floor, windows, doors, balconies, columns, beams, niches, and any built-in architectural elements
- Floor material, tile or marble veining pattern, baseboards, crown molding
- Outdoor view through glass (same buildings/sky/vegetation), window frames and mullions
- Wall-mounted or ceiling-mounted fixtures that are part of the structure (e.g. AC indoor unit, fixed chandelier body, recessed spots) — keep them exactly where they are

YOUR ONLY TASK:
Remove every portable / movable item: sofas, armchairs, tables, stools, beds, rugs, poufs, plants, vases, books, decor, freestanding lamps, loose mirrors, wall art/pictures that hang on the wall (replace with bare wall matching surrounding paint/plaster), curtains and drapes (leave bare window opening if needed), clutter on surfaces. The room should read as genuinely empty of furniture and loose objects.

STRICTLY FORBIDDEN:
- Inventing a different room, different windows, different floor plan, or different outdoor scenery
- Moving, resizing, or swapping architectural elements
- Changing lighting direction or time of day dramatically — keep the same natural/artificial light character
- Adding new furniture, staging props, or "placeholder" decor

OUTPUT: One photorealistic edited image. A viewer must be able to overlay it mentally on the input and see the same shell, cleared of movable contents.`;

export async function emptyRoom(
  originalUrl: string,
): Promise<{ base64: string; mimeType: string }> {
  const raw = await fetchImageBytes(originalUrl);
  const { bytes: inputBytes, mime } = await downscaleForGemini(raw);
  const image: Part = {
    inlineData: { data: inputBytes.toString("base64"), mimeType: mime },
  };

  const response = await ai.models.generateContent({
    model: env.GEMINI_IMAGE_MODEL,
    // Image d’abord : le modèle ancre la géométrie sur le pixel grid réel.
    contents: [{ role: "user", parts: [image, { text: EMPTY_ROOM_EDIT_PROMPT }] }],
    config: {
      responseModalities: [...IMAGE_MODALITIES],
      temperature: env.AI_EMPTY_ROOM_TEMPERATURE,
      ...(env.AI_EMPTY_ROOM_SEED != null ? { seed: env.AI_EMPTY_ROOM_SEED } : {}),
    },
  });

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const textPart = parts.find((p) => p.text)?.text;
  const imagePart = parts.find((p) => p.inlineData?.data);

  // Diagnostic complet : on saura toujours pourquoi le modèle a échoué.
  const safetyRatings = candidate?.safetyRatings ?? [];
  const blocked = safetyRatings.some((r) => r.blocked);
  const outputBuffer = imagePart?.inlineData?.data
    ? Buffer.from(imagePart.inlineData.data, "base64")
    : null;
  const outBytes = outputBuffer?.byteLength ?? 0;
  const sizeRatio = outBytes
    ? Math.abs(outBytes - inputBytes.length) / Math.max(inputBytes.length, 1)
    : 0;
  const pixelDiff = outputBuffer
    ? await imageMeanAbsoluteDifference(inputBytes, outputBuffer)
    : null;

  console.log(
    JSON.stringify(
      {
        tag: "[emptyRoom]",
        model: env.GEMINI_IMAGE_MODEL,
        temperature: env.AI_EMPTY_ROOM_TEMPERATURE,
        seed: env.AI_EMPTY_ROOM_SEED ?? null,
        finishReason: candidate?.finishReason,
        parts: parts.length,
        hasImage: Boolean(imagePart),
        hasText: Boolean(textPart),
        text: textPart?.slice(0, 240),
        inputBytes: inputBytes.length,
        outputBytes: outBytes,
        sizeDeltaPct: Number((sizeRatio * 100).toFixed(2)),
        pixelDiffPct: pixelDiff == null ? null : Number((pixelDiff * 100).toFixed(2)),
        blocked,
        safety: safetyRatings.map((r) => ({
          category: r.category,
          probability: r.probability,
          blocked: r.blocked,
        })),
      },
      null,
      2,
    ),
  );

  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new Error(
      `Gemini n'a pas renvoyé d'image (finishReason=${candidate?.finishReason}, blocked=${blocked}). ` +
        (textPart ? `Réponse texte: ${textPart.slice(0, 200)}` : "Aucune réponse texte."),
    );
  }

  // Si la sortie est visuellement quasi identique, Gemini a refusé l'édition.
  if (pixelDiff != null && pixelDiff < 0.02) {
    throw new Error(
      `Gemini a renvoyé une image quasi identique à la photo d'origine (diff=${(pixelDiff * 100).toFixed(1)}%). ` +
        "Le modèle n'a pas voulu vider la pièce avec ce prompt — clique « Relancer l'IA » pour réessayer.",
    );
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

// ------------------------------------------------------------------
// 3. Rendu final (Gemini 2.5 Flash Image, multi-image input)
// ------------------------------------------------------------------

export type RenderInput = {
  emptiedUrl: string;
  productImages: { category: string; name: string; url: string }[];
  style: string;
  palette: string;
  roomType: string;
};

export async function renderFinal(
  input: RenderInput,
): Promise<{ base64: string; mimeType: string }> {
  const base = await fetchImageAsInlinePart(input.emptiedUrl);
  const products = await Promise.all(
    input.productImages.map(async (p) => ({
      category: p.category,
      name: p.name,
      part: await fetchImageAsInlinePart(p.url),
    })),
  );

  const instructions = `You receive (1) a photograph of an empty room and (2..n) product reference photos.
Objective: insert the provided furniture and accessories into the empty room to produce a single photoreal interior photo.
Hard constraints:
- Preserve the original room's walls, windows, floor, lighting direction, perspective, camera framing and focal length exactly.
- Each provided product must appear as itself (respect geometry, material, fabric, colour) — do not invent alternative items.
- Respect real-world scale and keep realistic shadows matching the existing light.
- Match the requested mood: style "${input.style}", palette "${input.palette}", room type "${input.roomType}".
- Do not add furniture that wasn't provided. Minor decoration (plant, cushions) only if needed to balance the composition.
- Output a single high-resolution finished photo, no text, no watermark.`;

  const parts: Part[] = [
    { text: instructions },
    { text: "Empty room:" },
    base,
  ];
  for (const product of products) {
    parts.push({ text: `Product — ${product.category} — ${product.name}:` });
    parts.push(product.part);
  }

  const response = await ai.models.generateContent({
    model: env.GEMINI_IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    config: { responseModalities: [...IMAGE_MODALITIES] },
  });

  const inline = firstInline(response);
  if (!inline) throw new Error("Gemini n'a pas renvoyé de rendu.");
  return inline;
}

// ------------------------------------------------------------------
// 4. Conseil UrdeKo + scoring produits (Gemini 2.5 Pro)
// ------------------------------------------------------------------

export async function writeAdvice(context: {
  style: string;
  palette: string;
  products: { category: string; name: string }[];
}): Promise<string> {
  const prompt = `Rédige en français, en 2 à 3 phrases, un "conseil UrdeKo" qui explique pourquoi l'harmonie entre le style "${context.style}", la palette "${context.palette}" et les produits ci-dessous fonctionne. Ton voix : éditorial, chaleureux, précis, jamais commercial.
Produits :
${context.products.map((p) => `- ${p.category}: ${p.name}`).join("\n")}`;

  const response = await ai.models.generateContent({
    model: env.GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini n'a pas renvoyé de conseil.");
  return text;
}

export type ProductScore = {
  productId: string;
  score: number;
  reason: string;
  badge: "recommande" | "economique" | "hors_budget" | "coherent";
};

const productScoreSchema: z.ZodType<ProductScore> = z.object({
  productId: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
  badge: z.enum(["recommande", "economique", "hors_budget", "coherent"]),
});

export async function scoreProducts(input: {
  style: string;
  palette: string;
  budgetMad: number;
  categories: string[];
  candidates: {
    id: string;
    category: string;
    name: string;
    priceMad: number;
    tags: string[];
  }[];
}): Promise<ProductScore[]> {
  const prompt = `Tu es styliste d'intérieur. Étant donné le style "${input.style}", la palette "${input.palette}" et un budget total de ${input.budgetMad} MAD sur les catégories ${input.categories.join(", ")}, classe les candidats ci-dessous et retourne un JSON [{productId, score (0-10), reason (≤1 phrase FR), badge in ("recommande","economique","hors_budget","coherent")}].
Produits candidats :
${JSON.stringify(input.candidates)}`;

  const response = await ai.models.generateContent({
    model: env.GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });
  const allowedIds = new Set(input.candidates.map((candidate) => candidate.id));
  return parseGeminiJson(response.text, z.array(productScoreSchema), "scoring produits")
    .filter((score) => allowedIds.has(score.productId));
}

// ------------------------------------------------------------------
// 5. Préremplissage produit manuel admin
// ------------------------------------------------------------------

export type ProductMetadataSuggestion = {
  category: string | null;
  styles: string[];
  tags: string[];
  description: string;
};

const productMetadataSuggestionSchema: z.ZodType<ProductMetadataSuggestion> = z.object({
  category: z
    .enum(["canape", "table_basse", "tapis", "luminaire", "decoration", "meuble_tv"])
    .nullable(),
  styles: z.array(
    z.enum(["moderne", "contemporain", "minimaliste", "japandi", "chaleureux", "elegant"]),
  ),
  tags: z.array(z.string()),
  description: z.string(),
});

export async function suggestProductMetadata(input: {
  name: string;
  brand: string;
  image?: { buffer: Buffer; mimeType: string };
}): Promise<ProductMetadataSuggestion> {
  const prompt = `Tu aides un admin UrdeKo à cataloguer un produit déco/meuble.
Réponds UNIQUEMENT en JSON valide :
{
  "category": "canape" | "table_basse" | "tapis" | "luminaire" | "decoration" | "meuble_tv" | null,
  "styles": Array<"moderne" | "contemporain" | "minimaliste" | "japandi" | "chaleureux" | "elegant">,
  "tags": string[], // 4 à 8 tags courts en français, sans doublon
  "description": string // 1 phrase française, concrète, non commerciale
}

Produit :
- Nom : ${input.name}
- Marque : ${input.brand}

Priorité : si l'image est fournie, utilise-la pour détecter la catégorie, les matières, les couleurs et le style.`;

  const parts: Part[] = [{ text: prompt }];
  if (input.image) {
    const { bytes, mime } = await downscaleForGemini(input.image.buffer);
    parts.push({
      inlineData: {
        data: bytes.toString("base64"),
        mimeType: mime || input.image.mimeType,
      },
    } as Part);
  }

  const response = await ai.models.generateContent({
    model: env.GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json" },
  });

  return parseGeminiJson(
    response.text,
    productMetadataSuggestionSchema,
    "préremplissage produit",
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

type GeminiResponse = Awaited<
  ReturnType<typeof ai.models.generateContent>
>;

function firstInline(
  response: GeminiResponse,
): { base64: string; mimeType: string } | null {
  const candidates = response.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
  }
  return null;
}

function parseGeminiJson<T>(text: string | undefined, schema: z.ZodType<T>, label: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text ?? "null");
  } catch {
    throw new Error(`Gemini a renvoyé un JSON invalide pour ${label}.`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Gemini a renvoyé une structure invalide pour ${label}.`);
  }
  return result.data;
}

async function imageMeanAbsoluteDifference(a: Buffer, b: Buffer): Promise<number> {
  const [left, right] = await Promise.all([
    normalizedTinyGrayscale(a),
    normalizedTinyGrayscale(b),
  ]);
  if (left.length !== right.length) return 1;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff += Math.abs((left[i] ?? 0) - (right[i] ?? 0));
  }
  return diff / (left.length * 255);
}

async function normalizedTinyGrayscale(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();
}
