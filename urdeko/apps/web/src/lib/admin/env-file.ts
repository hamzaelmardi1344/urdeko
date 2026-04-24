import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";

// =====================================================================
// Lecture & écriture du .env.local — dev-only. On masque les secrets
// sensibles par défaut côté UI, mais on n'empêche pas de les afficher.
//
// Fichiers cibles (par ordre de priorité) :
//   - apps/web/.env.local  (le plus spécifique au runtime Next.js)
//   - ../../.env.local     (racine monorepo, partagé avec setup.sh)
// =====================================================================

export type EnvLine =
  | { kind: "comment"; raw: string }
  | { kind: "blank"; raw: string }
  | { kind: "kv"; raw: string; key: string; value: string; quoted: boolean };

// Clés considérées comme sensibles — on masque la valeur par défaut.
export const SECRET_KEYS = new Set<string>([
  "AUTH_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_PASSWORD",
  "GEMINI_API_KEY",
  "INTERNAL_JOB_SECRET",
  "CRON_SECRET",
  "DATABASE_URL",
  "S3_SECRET_KEY",
  "S3_ACCESS_KEY",
]);

function rootDir(): string {
  // process.cwd() = apps/web en dev. On résout les 2 candidats.
  return resolve(process.cwd(), "..", "..");
}

function candidates(): string[] {
  return [
    join(process.cwd(), ".env.local"),
    join(rootDir(), ".env.local"),
  ];
}

export async function findEnvFile(): Promise<string | null> {
  for (const p of candidates()) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // fichier absent, on essaie le suivant
    }
  }
  return null;
}

export async function readEnvFile(
  path: string,
): Promise<{ path: string; lines: EnvLine[] }> {
  const content = await fs.readFile(path, "utf-8");
  const lines: EnvLine[] = content.split(/\r?\n/).map((raw) => parseLine(raw));
  return { path, lines };
}

function parseLine(raw: string): EnvLine {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "blank", raw };
  if (trimmed.startsWith("#")) return { kind: "comment", raw };

  const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!m) return { kind: "comment", raw };

  const key = m[1] ?? "";
  let value = m[2] ?? "";
  let quoted = false;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    quoted = true;
    value = value.slice(1, -1);
  }
  return { kind: "kv", raw, key, value, quoted };
}

function serializeLine(line: EnvLine): string {
  if (line.kind === "blank" || line.kind === "comment") return line.raw;
  const needsQuotes = line.quoted || /[\s#"'$]/.test(line.value);
  const quoted = needsQuotes
    ? `"${line.value.replace(/"/g, '\\"')}"`
    : line.value;
  return `${line.key}=${quoted}`;
}

export async function writeEnvFile(
  path: string,
  updates: Record<string, string>,
): Promise<void> {
  const { lines } = await readEnvFile(path);
  const updatedKeys = new Set<string>();

  const out = lines.map<EnvLine>((line) => {
    if (line.kind !== "kv") return line;
    if (!(line.key in updates)) return line;
    updatedKeys.add(line.key);
    return {
      ...line,
      value: updates[line.key] ?? "",
    };
  });

  // Nouvelles clés : on les ajoute à la fin.
  for (const [key, value] of Object.entries(updates)) {
    if (updatedKeys.has(key)) continue;
    out.push({ kind: "kv", raw: "", key, value, quoted: true });
  }

  // Backup rapide (.env.local.bak) avant d'écrire.
  try {
    const current = await fs.readFile(path, "utf-8");
    await fs.writeFile(`${path}.bak`, current, "utf-8");
  } catch {
    // pas critique si le backup échoue
  }

  const text = out.map(serializeLine).join("\n");
  await fs.writeFile(path, text.endsWith("\n") ? text : `${text}\n`, "utf-8");
}
