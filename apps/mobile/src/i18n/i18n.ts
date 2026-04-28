import { I18n } from "i18n-js";
import { translations } from "./translations";

export const i18n = new I18n(translations);
i18n.defaultLocale = "fr";
i18n.locale = "fr";
i18n.enableFallback = true;

export function t(scope: string, options?: Record<string, string | number>): string {
  return i18n.t(scope, options);
}
