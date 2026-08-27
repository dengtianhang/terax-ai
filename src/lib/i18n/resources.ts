export type Locale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en-US";
}

export const messages: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    "settings.general": "常规",
    "settings.language": "界面语言",
    "settings.languageDescription": "选择 Terax 界面显示语言。",
    "settings.chinese": "简体中文",
    "settings.english": "English",
    "workspace.windows": "Windows",
    "workspace.selectDirectory": "选择目录",
    "workspace.environment": "工作区环境",
    "workspace.noDirectory": "无目录",
    "common.loading": "加载中...",
    "common.raw": "原始",
    "common.rendered": "预览",
  },
  "en-US": {
    "settings.general": "General",
    "settings.language": "Interface language",
    "settings.languageDescription": "Choose the language used by the Terax interface.",
    "settings.chinese": "简体中文",
    "settings.english": "English",
    "workspace.windows": "Windows",
    "workspace.selectDirectory": "Select directory",
    "workspace.environment": "Workspace environment",
    "workspace.noDirectory": "no directory",
    "common.loading": "Loading...",
    "common.raw": "Raw",
    "common.rendered": "Rendered",
  },
};
