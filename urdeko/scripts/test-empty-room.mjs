// =====================================================================
// Test direct Gemini Flash Image — vide une pièce, sans la stack Next.
//
// Usage :
//   GEMINI_API_KEY=xxx node scripts/test-empty-room.mjs ./ma-photo.jpg
//
// La clé peut aussi venir de .env.local (chargé automatiquement).
// Sortie : ./scripts/output-empty-room.png + log JSON détaillé.
// =====================================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- chargement minimaliste de .env.local (sans dépendance) ----------
function loadDotenv(file) {
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadDotenv(join(ROOT, ".env.local"));
loadDotenv(join(ROOT, "apps/web/.env.local"));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("✗ GEMINI_API_KEY manquante (ni en env, ni dans .env.local)");
  process.exit(1);
}

const photoPath = process.argv[2];
if (!photoPath) {
  console.error("✗ Usage : node scripts/test-empty-room.mjs <chemin/photo.jpg>");
  process.exit(1);
}
const absPhoto = resolve(photoPath);
if (!existsSync(absPhoto)) {
  console.error(`✗ Photo introuvable : ${absPhoto}`);
  process.exit(1);
}

const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
const buf = readFileSync(absPhoto);
const mime = absPhoto.endsWith(".png") ? "image/png" : "image/jpeg";
console.log(`→ Modèle : ${model}`);
console.log(`→ Photo  : ${absPhoto} (${buf.length} octets)`);

const PROMPTS = {
  A: "Empty this room.",
  B: "Generate a photograph of this exact same room completely empty and unfurnished. Remove every piece of furniture, decoration, textile, plant and clutter. Keep only walls, floor, ceiling, windows, doors. Same camera angle and lighting.",
  C: "Remove all furniture and decoration. Keep only the architecture (walls, floor, ceiling, windows, doors).",
  D: "Show me this room without any furniture, completely empty.",
};

const ai = new GoogleGenAI({ apiKey });

async function run(label, prompt) {
  console.log(`\n=== Prompt ${label} ===`);
  console.log(prompt);
  const t0 = Date.now();
  const res = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: buf.toString("base64"), mimeType: mime } },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 1,
    },
  });
  const dt = Date.now() - t0;

  const candidate = res.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.find((p) => p.text)?.text;
  const imagePart = parts.find((p) => p.inlineData?.data);
  const outBytes = imagePart?.inlineData?.data
    ? Buffer.byteLength(imagePart.inlineData.data, "base64")
    : 0;
  const sizeRatio = outBytes
    ? Math.abs(outBytes - buf.length) / Math.max(buf.length, 1)
    : 0;

  console.log({
    durationMs: dt,
    finishReason: candidate?.finishReason,
    parts: parts.length,
    hasImage: Boolean(imagePart),
    inputBytes: buf.length,
    outputBytes: outBytes,
    sizeDeltaPct: Number((sizeRatio * 100).toFixed(2)),
    text: text?.slice(0, 200),
    safetyRatings: candidate?.safetyRatings,
  });

  if (imagePart?.inlineData?.data) {
    const out = join(__dirname, `output-empty-${label}.png`);
    writeFileSync(out, Buffer.from(imagePart.inlineData.data, "base64"));
    console.log(`→ Image écrite : ${out}`);
  } else {
    console.log("→ Aucune image renvoyée.");
  }
}

const which = process.env.PROMPT || "ALL";
const list = which === "ALL" ? Object.entries(PROMPTS) : [[which, PROMPTS[which]]];
for (const [label, prompt] of list) {
  if (!prompt) continue;
  try {
    await run(label, prompt);
  } catch (e) {
    console.error(`✗ Prompt ${label} a planté :`, e.message);
  }
}
