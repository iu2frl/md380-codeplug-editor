import { afterEach, beforeEach, describe, expect, it as test } from "vitest";
import {
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getLocale,
  initLocale,
  isLocale,
  setLocale,
  t,
} from "./index";
import type { MessageKey } from "./en";

beforeEach(() => {
  localStorage.clear();
  setLocale("en");
});

afterEach(() => {
  localStorage.clear();
  setLocale("en");
});

describe("t()", () => {
  test("returns English by default", () => {
    expect(t("language.label")).toBe("Language");
  });

  test("switches translation when locale changes", () => {
    setLocale("it");
    expect(t("language.label")).toBe("Lingua");
    setLocale("fr");
    expect(t("language.label")).toBe("Langue");
  });

  test("interpolates {var} placeholders", () => {
    setLocale("en");
    expect(t("language.current", { name: "English" })).toBe("Current language: English");
    setLocale("fr");
    expect(t("language.current", { name: "Français" })).toBe("Langue actuelle : Français");
  });

  test("leaves unknown placeholders untouched", () => {
    expect(t("language.current", {})).toBe("Current language: {name}");
  });

  test("falls back to the raw key for unknown messages", () => {
    expect(t("totally.missing.key" as MessageKey)).toBe("totally.missing.key");
  });
});

describe("locale detection", () => {
  test("isLocale validates supported codes only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("it")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(SUPPORTED_LOCALES).toEqual(["en", "it", "fr"]);
  });

  test("setLocale persists the choice", () => {
    setLocale("it");
    expect(getLocale()).toBe("it");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("it");
  });

  test("initLocale restores a saved choice", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    expect(initLocale()).toBe("fr");
    expect(getLocale()).toBe("fr");
  });

  test("initLocale ignores invalid saved values", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "xx");
    const detected = initLocale();
    expect(SUPPORTED_LOCALES).toContain(detected);
  });
});

describe("document language attribute", () => {
  test("setLocale reflects the active locale on <html lang>", () => {
    setLocale("it");
    expect(document.documentElement.lang).toBe("it");
    setLocale("fr");
    expect(document.documentElement.lang).toBe("fr");
    setLocale("en");
    expect(document.documentElement.lang).toBe("en");
  });

  test("initLocale sets <html lang> from the restored choice", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    initLocale();
    expect(document.documentElement.lang).toBe("fr");
  });
});

