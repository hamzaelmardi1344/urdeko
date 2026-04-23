import { createClient, type ClientConfig, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { env } from "@/env";

// Initialisation paresseuse : les appels au client ne partent jamais avant un
// premier appel runtime, ce qui autorise `next build` sans projectId (mode
// SKIP_ENV_VALIDATION) mais échoue clairement au runtime si mal configuré.
let _client: SanityClient | null = null;
let _builder: ReturnType<typeof imageUrlBuilder> | null = null;

function getConfig(): ClientConfig {
  if (!env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    throw new Error(
      "Sanity non configuré : NEXT_PUBLIC_SANITY_PROJECT_ID manquant.",
    );
  }
  return {
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: "2024-10-15",
    useCdn: true,
    token: env.SANITY_API_TOKEN || undefined,
    perspective: "published",
  };
}

function getClient(): SanityClient {
  if (!_client) _client = createClient(getConfig());
  return _client;
}

function getBuilder() {
  if (!_builder) {
    const cfg = getConfig();
    _builder = imageUrlBuilder({
      projectId: cfg.projectId!,
      dataset: cfg.dataset ?? "production",
    });
  }
  return _builder;
}

// Proxy : toute propriété/méthode accédée traverse le client initialisé à la
// volée. L'import reste sans effet tant qu'on ne l'utilise pas.
export const sanity = new Proxy({} as SanityClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function urlForImage(source: unknown): string | null {
  if (!source) return null;
  try {
    return getBuilder().image(source as never).auto("format").quality(90).url();
  } catch {
    return null;
  }
}
