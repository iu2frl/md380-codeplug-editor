import { en, type MessageKey } from "./en";
import { it } from "./it";
import { fr } from "./fr";

export type { MessageKey } from "./en";

export type Locale = "en" | "it" | "fr";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "it", "fr"];

// Key used to persist the user's language choice across reloads.
export const LOCALE_STORAGE_KEY = "md380.locale";

// English is always the complete source of truth. Other locales may be partial;
// any key they omit transparently falls back to English via t().
const DICTIONARIES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, it, fr };

let currentLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Reflect the active locale on the document root so assistive tech, the browser,
// and CSS `:lang()` selectors all see the correct language.
function applyDocumentLang(locale: Locale): void {
  try {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale;
    }
  } catch {
    // Non-DOM environments (tests, SSR) can safely ignore this.
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  applyDocumentLang(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable (private mode, restricted contexts); ignore.
  }
}

// Resolve the initial locale: saved choice -> browser language -> English.
export function initLocale(): Locale {
  let detected: Locale = "en";
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) {
      detected = saved;
    } else if (typeof navigator !== "undefined") {
      const browserLang = navigator.language?.slice(0, 2).toLowerCase();
      if (isLocale(browserLang)) {
        detected = browserLang;
      }
    }
  } catch {
    // Ignore detection failures and keep the English default.
  }
  currentLocale = detected;
  applyDocumentLang(detected);
  return detected;
}

// Translate a key for the active locale.
// Resolution order: active locale -> English -> the raw key (so a missing
// string is visible but never crashes). Supports {var} interpolation.
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = DICTIONARIES[currentLocale][key] ?? DICTIONARIES.en[key] ?? key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
