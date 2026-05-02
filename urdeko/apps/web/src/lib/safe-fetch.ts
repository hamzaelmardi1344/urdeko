import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_REDIRECTS = 5;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export class SafeFetchError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

export async function assertSafeHttpUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafeFetchError("URL invalide", value);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchError("Seules les URLs HTTP(S) sont autorisées", value);
  }
  if (url.username || url.password) {
    throw new SafeFetchError("Les identifiants dans l'URL ne sont pas autorisés", value);
  }

  if (process.env.NODE_ENV === "production") {
    await assertPublicHost(url);
  }

  return url;
}

export async function safeFetch(
  value: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; maxRedirects?: number } = {},
): Promise<{ response: Response; finalUrl: string }> {
  let current = await assertSafeHttpUrl(value);
  const maxRedirects = opts.maxRedirects ?? DEFAULT_REDIRECTS;

  for (let i = 0; i <= maxRedirects; i += 1) {
    const response = await fetchWithTimeout(
      current.toString(),
      { ...init, redirect: "manual" },
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (!isRedirect(response.status)) {
      return { response, finalUrl: current.toString() };
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new SafeFetchError("Redirection sans en-tête Location", current.toString());
    }
    current = await assertSafeHttpUrl(new URL(location, current).toString());
  }

  throw new SafeFetchError("Trop de redirections", current.toString());
}

export async function readResponseBufferLimited(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > maxBytes) {
    throw new Error(`Réponse trop volumineuse (> ${Math.round(maxBytes / 1024 / 1024)} Mo)`);
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Réponse trop volumineuse (> ${Math.round(maxBytes / 1024 / 1024)} Mo)`);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Réponse trop volumineuse (> ${Math.round(maxBytes / 1024 / 1024)} Mo)`);
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

export async function fetchImageBuffer(
  url: string,
  opts: {
    maxBytes: number;
    timeoutMs?: number;
    headers?: HeadersInit;
  },
): Promise<{ buffer: Buffer; mimeType: string; finalUrl: string }> {
  const { response, finalUrl } = await safeFetch(
    url,
    {
      headers: opts.headers,
      cache: "no-store",
    },
    { timeoutMs: opts.timeoutMs },
  );

  if (!response.ok) {
    throw new Error(`Image inaccessible (${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const buffer = await readResponseBufferLimited(response, opts.maxBytes);
  const detected = detectImageMime(buffer);
  const mimeType = IMAGE_MIME_TYPES.has(contentType) ? contentType : detected;

  if (!mimeType) {
    throw new Error("L'URL ne pointe pas vers une image supportée");
  }

  return { buffer, mimeType, finalUrl };
}

export function imageExtensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return ".jpg";
  }
}

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal })
    .catch((error) => {
      if ((error as Error).name === "AbortError") {
        throw new SafeFetchError("Délai dépassé (timeout)", url);
      }
      throw error;
    })
    .finally(() => clearTimeout(timeout));
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SafeFetchError("Les URLs localhost sont refusées en production", url.toString());
  }

  const direct = isIP(host);
  const addresses = direct
    ? [{ address: host }]
    : await lookup(host, { all: true, verbatim: false }).catch(() => {
        throw new SafeFetchError("Nom de domaine introuvable", url.toString());
      });

  for (const entry of addresses) {
    if (isPrivateAddress(entry.address)) {
      throw new SafeFetchError(
        "Les URLs vers des adresses privées sont refusées en production",
        url.toString(),
      );
    }
  }
}

function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8")
    );
  }

  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function detectImageMime(buffer: Buffer): string | "" {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 12) === "ftypavif") {
    return "image/avif";
  }
  return "";
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
