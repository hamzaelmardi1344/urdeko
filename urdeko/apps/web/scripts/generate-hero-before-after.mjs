// =====================================================================
// Script one-shot : génère les deux visuels "avant / après" de la
// landing page à partir d'une vraie photo de pièce vide, en appelant
// Gemini UNE SEULE FOIS pour la version meublée.
//
// Entrée  : une photo d'une pièce vide (Unsplash)
// Sortie  : apps/web/public/images/hero-before.jpg
//           apps/web/public/images/hero-after.jpg
//
// Usage :
//   node scripts/generate-hero-before-after.mjs
//   # ou forcer une autre source :
//   SOURCE_URL=https://images.unsplash.com/photo-XXXX \
//     node scripts/generate-hero-before-after.mjs
// =====================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");        // apps/web
const MONO_ROOT = resolve(WEB_ROOT, "..", "..");  // racine monorepo

function loadDotenv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadDotenv(join(WEB_ROOT, ".env.local"));
loadDotenv(join(MONO_ROOT, ".env.local"));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("✗ GEMINI_API_KEY manquante (.env.local).");
  process.exit(1);
}

const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
const maxEdge = Number(process.env.AI_IMAGE_MAX_EDGE ?? 1536);
const emptyRoomTemp = Number(process.env.AI_EMPTY_ROOM_TEMPERATURE ?? 0.35);
const emptyRoomSeedRaw = process.env.AI_EMPTY_ROOM_SEED?.trim();
const emptyRoomSeed =
  emptyRoomSeedRaw && Number.isFinite(Number(emptyRoomSeedRaw))
    ? Math.trunc(Number(emptyRoomSeedRaw))
    : undefined;

// Synchroniser avec EMPTY_ROOM_EDIT_PROMPT dans src/lib/ai/gemini.ts
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

// Logique : on part du rendu AFTER (magnifique salon Japandi) et on
// demande à Gemini de VIDER cette même pièce — comme le fait réellement
// l'app au step 2. Résultat : AVANT et APRÈS montrent EXACTEMENT la
// même architecture (mêmes murs, sol, fenêtre), ce qui est authentique
// et illustre fidèlement la fonctionnalité.
//
// 1 seul appel Gemini, le AFTER existant reste inchangé.

const OUT_DIR = join(WEB_ROOT, "public/images");
const OUT_BEFORE = join(OUT_DIR, "hero-before.jpg");
const OUT_AFTER = join(OUT_DIR, "hero-after.jpg");

mkdirSync(OUT_DIR, { recursive: true });

if (!existsSync(OUT_AFTER)) {
  console.error(`✗ Le fichier AFTER n'existe pas encore : ${OUT_AFTER}`);
  console.error("  Fournis une image Japandi meublée comme référence, ou utilise --regenerate-after.");
  process.exit(1);
}

const afterBuf = readFileSync(OUT_AFTER);
console.log(`→ Référence APRÈS : ${OUT_AFTER} (${afterBuf.length} octets)`);
console.log(`→ Modèle IA       : ${model}`);

const afterBytes = await sharp(afterBuf)
  .rotate()
  .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer();

// Un seul appel Gemini : on vide la pièce de tous ses meubles.
const ai = new GoogleGenAI({ apiKey });

console.log("\n→ Appel Gemini (1 call)…");
const t0 = Date.now();
const result = await ai.models.generateContent({
  model,
  contents: [
    {
      role: "user",
      parts: [
        { inlineData: { data: afterBytes.toString("base64"), mimeType: "image/jpeg" } },
        { text: EMPTY_ROOM_EDIT_PROMPT },
      ],
    },
  ],
  config: {
    responseModalities: [Modality.TEXT, Modality.IMAGE],
    temperature: emptyRoomTemp,
    ...(emptyRoomSeed != null ? { seed: emptyRoomSeed } : {}),
  },
});
const dt = Date.now() - t0;

const candidate = result.candidates?.[0];
const parts = candidate?.content?.parts ?? [];
const textPart = parts.find((p) => p.text)?.text;
const imagePart = parts.find((p) => p.inlineData?.data);

console.log({
  durationMs: dt,
  finishReason: candidate?.finishReason,
  parts: parts.length,
  hasImage: Boolean(imagePart),
  hasText: Boolean(textPart),
  textPreview: textPart?.slice(0, 200),
});

if (!imagePart?.inlineData?.data) {
  console.error("✗ Gemini n'a pas renvoyé d'image.");
  console.error(textPart ?? "");
  process.exit(2);
}

const beforeRaw = Buffer.from(imagePart.inlineData.data, "base64");
const beforeBytes = await sharp(beforeRaw)
  .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer();
writeFileSync(OUT_BEFORE, beforeBytes);
console.log(`✓ AVANT écrit : ${OUT_BEFORE} (${beforeBytes.length} octets)`);

console.log("\n✅ Terminé. AVANT = pièce vidée par Gemini, APRÈS = même pièce meublée.");
console.log("   /images/hero-before.jpg  (généré)");
console.log("   /images/hero-after.jpg   (inchangé)");
