#!/usr/bin/env node
/**
 * Pousse les variables d’un fichier .env vers un service Northflank « combined »
 * (runtime + build args NEXT_PUBLIC_*), via l’API — évite la saisie manuelle dans l’UI.
 *
 * Usage (depuis la racine du monorepo `urdeko/`) :
 *   NORTHFLANK_API_TOKEN=... NORTHFLANK_PROJECT_ID=... NORTHFLANK_SERVICE_ID=... \
 *     node scripts/sync-northflank-env.mjs .env.northflank.local
 *
 * Ou mets NORTHFLANK_* dans le même fichier que les vars app (voir .env.northflank.example).
 *
 * Options :
 *   --dry-run   Affiche le JSON sans appeler l’API
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const META_PREFIX = "NORTHFLANK_";

function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let key = trimmed.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!key) continue;
    let raw = trimmed.slice(eq + 1).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    out[key] = raw;
  }
  return out;
}

function pickMeta(all) {
  const token =
    all.NORTHFLANK_API_TOKEN ?? process.env.NORTHFLANK_API_TOKEN ?? "";
  const projectId =
    all.NORTHFLANK_PROJECT_ID ?? process.env.NORTHFLANK_PROJECT_ID ?? "";
  const serviceId =
    all.NORTHFLANK_SERVICE_ID ?? process.env.NORTHFLANK_SERVICE_ID ?? "";
  const teamId =
    all.NORTHFLANK_TEAM_ID ?? process.env.NORTHFLANK_TEAM_ID ?? "";
  return { token, projectId, serviceId, teamId };
}

function stripMeta(all) {
  /** @type {Record<string, string>} */
  const app = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(META_PREFIX)) continue;
    app[k] = v;
  }
  return app;
}

function buildPayload(appEnv) {
  /** @type {Record<string, string>} */
  const runtimeEnvironment = {};
  /** @type {Record<string, string>} */
  const buildArguments = {};

  for (const [k, v] of Object.entries(appEnv)) {
    if (v === "") continue;
    runtimeEnvironment[k] = v;
    if (k.startsWith("NEXT_PUBLIC_")) {
      buildArguments[k] = v;
    }
  }

  return { runtimeEnvironment, buildArguments };
}

function apiUrl(projectId, serviceId, teamId) {
  if (teamId) {
    return `https://api.northflank.com/v1/teams/${encodeURIComponent(teamId)}/projects/${encodeURIComponent(projectId)}/services/combined/${encodeURIComponent(serviceId)}`;
  }
  return `https://api.northflank.com/v1/projects/${encodeURIComponent(projectId)}/services/combined/${encodeURIComponent(serviceId)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const files = args.filter((a) => !a.startsWith("--"));
  const envPath = path.resolve(
    process.cwd(),
    files[0] ?? ".env.northflank.local",
  );

  if (!fs.existsSync(envPath)) {
    console.error(`Fichier introuvable : ${envPath}`);
    console.error(
      "Crée ce fichier (gitignored) ou passe le chemin en argument. Voir .env.northflank.example",
    );
    process.exit(1);
  }

  const all = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  const { token, projectId, serviceId, teamId } = pickMeta(all);

  if (!token || !projectId || !serviceId) {
    console.error(
      "Manque NORTHFLANK_API_TOKEN, NORTHFLANK_PROJECT_ID ou NORTHFLANK_SERVICE_ID (dans le fichier .env ou dans l’environnement).",
    );
    process.exit(1);
  }

  const appEnv = stripMeta(all);
  const { runtimeEnvironment, buildArguments } = buildPayload(appEnv);

  const body = JSON.stringify({ runtimeEnvironment, buildArguments });

  if (dryRun) {
    console.log(body);
    process.exit(0);
  }

  const url = apiUrl(projectId, serviceId, teamId);
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Northflank API ${res.status}:`, text);
    process.exit(1);
  }

  console.log(
    `OK — ${Object.keys(runtimeEnvironment).length} runtime, ${Object.keys(buildArguments).length} build args`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
