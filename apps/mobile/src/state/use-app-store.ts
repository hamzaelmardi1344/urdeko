import { create } from "zustand";
import type { Locale } from "@bep/shared-types";
import { i18n } from "@/i18n/i18n";
import { storage } from "@/storage/mmkv";

type AppState = {
  locale: Locale;
  shopId: string | null;
  setLocale: (locale: Locale) => void;
  setShopId: (shopId: string | null) => void;
};

const storedLocale = storage.getString("locale");
const initialLocale: Locale = storedLocale === "ar" || storedLocale === "darija" ? storedLocale : "fr";
i18n.locale = initialLocale;

export const useAppStore = create<AppState>((set) => ({
  locale: initialLocale,
  shopId: storage.getString("shopId") ?? null,
  setLocale: (locale) => {
    i18n.locale = locale;
    storage.set("locale", locale);
    set({ locale });
  },
  setShopId: (shopId) => {
    if (shopId) storage.set("shopId", shopId);
    else storage.remove("shopId");
    set({ shopId });
  },
}));
