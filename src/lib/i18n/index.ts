import { usePreferencesStore } from "@/modules/settings/preferences";
import { messages, type Locale } from "./resources";

export { DEFAULT_LOCALE, type Locale } from "./resources";
export type MessageKey =
  | "settings.general"
  | "settings.language"
  | "settings.languageDescription"
  | "settings.chinese"
  | "settings.english"
  | "workspace.windows"
  | "workspace.selectDirectory"
  | "workspace.environment"
  | "workspace.noDirectory"
  | "common.loading"
  | "common.raw"
  | "common.rendered";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en-US";
}

export function getMessage(locale: Locale, key: string): string {
  return messages[locale]?.[key as MessageKey] ?? messages["en-US"]?.[key as MessageKey] ?? key;
}

export function useI18n() {
  const locale = usePreferencesStore((state) => state.locale);
  return { locale, t: (key: MessageKey) => getMessage(locale, key) };
}
