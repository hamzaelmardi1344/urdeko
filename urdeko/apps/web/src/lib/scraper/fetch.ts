const USER_AGENT =
  "UrdekoBot/1.0 (+https://urdeko.app/robots ; contact=hello@urdeko.app)";

const DEFAULT_TIMEOUT_MS = 20_000;

export class ScrapeFetchError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public url: string,
  ) {
    super(message);
    this.name = "ScrapeFetchError";
  }
}

export async function fetchHtml(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<{ html: string; finalUrl: string; contentType: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new ScrapeFetchError(
        `Fetch a échoué (${res.status} ${res.statusText})`,
        res.status,
        url,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/.test(contentType)) {
      throw new ScrapeFetchError(
        `Contenu non HTML (${contentType})`,
        res.status,
        url,
      );
    }

    const html = await res.text();
    return { html, finalUrl: res.url || url, contentType };
  } catch (err) {
    if (err instanceof ScrapeFetchError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ScrapeFetchError("Délai dépassé (timeout)", null, url);
    }
    throw new ScrapeFetchError((err as Error).message, null, url);
  } finally {
    clearTimeout(t);
  }
}

export function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function brandFromHost(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0] ?? host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Source";
  }
}
