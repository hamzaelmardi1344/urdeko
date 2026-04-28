import { z } from "zod";
import { getJson, setJson } from "@/storage/mmkv";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiOptions<T extends z.ZodTypeAny> = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  schema: T;
  cacheKey?: string;
};

export async function apiRequest<T extends z.ZodTypeAny>(
  options: ApiOptions<T>,
): Promise<z.infer<T>> {
  try {
    const response = await fetch(`${apiUrl}${options.path}`, {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(readErrorMessage(payload, response.status));
    }
    const parsed = options.schema.parse(payload);
    if ((options.method ?? "GET") === "GET" && options.cacheKey) {
      setJson(options.cacheKey, parsed);
    }
    return parsed;
  } catch (error) {
    if ((options.method ?? "GET") === "GET" && options.cacheKey) {
      const cached = getJson<z.infer<T>>(options.cacheKey);
      if (cached) return cached;
    }
    throw error;
  }
}

const errorSchema = z.object({ message: z.string() }).partial();

function readErrorMessage(payload: unknown, status: number): string {
  const parsed = errorSchema.safeParse(payload);
  return parsed.success && parsed.data.message ? parsed.data.message : `HTTP ${status}`;
}
