/* eslint-disable no-console */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { serve } from "inngest/node";
import { inngest, functions } from "./inngest";

// =====================================================================
// Service HTTP minimal pour exposer les fonctions Inngest du scraper.
// Déployable sur Render / Fly / Railway. Inngest Cloud enregistre cet
// endpoint et appelle /api/inngest pour démarrer/suivre les runs.
// =====================================================================

const handler = serve({
  client: inngest,
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

const port = Number.parseInt(process.env.PORT ?? "3030", 10);

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (req.url?.startsWith("/api/inngest")) {
    await handler(req, res);
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, () => {
  console.info(`[scraper] Inngest server listening on :${port}`);
  console.info(`[scraper] ${functions.length} Inngest functions registered.`);
});
