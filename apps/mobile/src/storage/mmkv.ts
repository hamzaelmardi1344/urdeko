import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({
  id: "jibi-mobile-storage",
});

export function getJson<T>(key: string): T | null {
  const value = storage.getString(key);
  if (!value) return null;
  const parsed: T = JSON.parse(value);
  return parsed;
}

export function setJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
