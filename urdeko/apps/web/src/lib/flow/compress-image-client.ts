/**
 * Réduit une image côté navigateur avant envoi en Server Action.
 * Vercel impose ~4,5 Mo au corps de la requête (FUNCTION_PAYLOAD_TOO_LARGE) :
 * une photo 12 Mo en JPEG dépasse cette limite avant même d'atteindre Next.js.
 */
/** Au-dessus : compression (Vercel ~4,5 Mo de corps de requête côté fonction). */
const SKIP_COMPRESS_BYTES = 2 * 1024 * 1024;
const TARGET_MAX_BYTES = 2.3 * 1024 * 1024;
const MAX_EDGE_FIRST = 2560;
const MAX_EDGE_AGGRESSIVE = 1920;
const MIME_OUT = "image/jpeg";

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), MIME_OUT, quality);
  });
}

export async function compressImageFileForUpload(file: File): Promise<File> {
  if (file.size <= SKIP_COMPRESS_BYTES) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Impossible de lire cette image ici (souvent HEIC sur Chrome). " +
        "Enregistre-la en JPG ou PNG depuis la galerie, ou réessaie avec Safari sur iPhone.",
    );
  }

  try {
    const { width: w, height: h } = bitmap;
    const scaleForMaxEdge = (maxEdge: number) =>
      Math.min(1, maxEdge / Math.max(w, h));

    const qualities = [0.88, 0.8, 0.72, 0.64, 0.56];
    const maxEdges = [MAX_EDGE_FIRST, MAX_EDGE_AGGRESSIVE, 1600, 1280];

    for (const maxEdge of maxEdges) {
      const s = scaleForMaxEdge(maxEdge);
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, cw, ch);

      for (const q of qualities) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (!blob) continue;
        if (blob.size <= TARGET_MAX_BYTES) {
          const base = file.name.replace(/\.[^.]+$/, "") || "photo";
          return new File([blob], `${base}.jpg`, { type: MIME_OUT });
        }
      }
    }

    throw new Error(
      "La photo reste trop lourde après compression. Choisis une image plus petite (ou exporte-la en JPG plus léger).",
    );
  } finally {
    bitmap.close();
  }
}
