import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, getMessage, isLocale, type Locale } from "./index";

describe("i18n", () => {
  it("defaults to simplified Chinese", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN");
  });

  it("accepts only supported locales", () => {
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("ja-JP")).toBe(false);
  });

  it("falls back to English when translation key is missing", () => {
    const key = "test.missing" as never as Parameters<typeof getMessage>[1];
    expect(getMessage("zh-CN" as Locale, key)).toBe("test.missing");
  });
});
