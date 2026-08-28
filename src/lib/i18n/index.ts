import { usePreferencesStore } from "@/modules/settings/preferences";
import { messages, textMessages, type Locale } from "./resources";

export { DEFAULT_LOCALE, type Locale } from "./resources";
export type MessageKey =
  | "settings.general"
  | "settings.editor"
  | "settings.themes"
  | "settings.shortcuts"
  | "settings.models"
  | "settings.agents"
  | "settings.about"
  | "settings.generalDescription"
  | "settings.appearance"
  | "settings.zoom"
  | "settings.explorer"
  | "settings.terminal"
  | "settings.editorDescription"
  | "settings.themesDescription"
  | "settings.shortcutsDescription"
  | "settings.modelsDescription"
  | "settings.agentsDescription"
  | "settings.aboutDescription"
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
  | "common.rendered"
  | "header.settings"
  | "header.toggleSidebar"
  | "header.commandPalette"
  | "sidebar.files"
  | "sidebar.git"
  | "ai.openAgent";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en-US";
}

export function getMessage(locale: Locale, key: string): string {
  return messages[locale]?.[key as MessageKey] ?? messages["en-US"]?.[key as MessageKey] ?? key;
}

export function getText(locale: Locale, text: string): string {
  return textMessages[locale]?.[text] ?? text;
}

export function useI18n() {
  const locale = usePreferencesStore((state) => state.locale);
  return {
    locale,
    t: (key: MessageKey) => getMessage(locale, key),
    tt: (text: string) => getText(locale, text),
  };
}
