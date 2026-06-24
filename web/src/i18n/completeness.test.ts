/**
 * Translation correctness gate (M2, relaxed for partial locales in M3).
 *
 * Locales are partial during migration (untranslated keys fall back to English
 * via t()), so this gate enforces *correctness* of whatever is provided rather
 * than full coverage:
 *   - Every key in a locale must be a real English key (no typos / stale keys).
 *   - No translation is empty/whitespace-only.
 *   - Each translation uses the same {placeholder} tokens as the English source.
 *
 * Full coverage (every key translated) is enforced later, per language, as the
 * exit criteria of M6 (Italian) and M7 (French).
 */
import { describe, expect, it as test } from "vitest";

import { en } from "./en";
import { it } from "./it";
import { fr } from "./fr";

type Dictionary = Record<string, string>;
type PartialDictionary = Partial<Record<string, string>>;

const LOCALES: Record<string, PartialDictionary> = { it, fr };
const EN: Dictionary = en;
const EN_KEYS = new Set(Object.keys(EN));

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("translation correctness", () => {
  for (const [locale, dict] of Object.entries(LOCALES)) {
    describe(`locale "${locale}"`, () => {
      test("only defines keys that exist in English", () => {
        const unknown = Object.keys(dict).filter((key) => !EN_KEYS.has(key));
        expect(unknown).toEqual([]);
      });

      test("has no empty translations", () => {
        const empty = Object.entries(dict)
          .filter(([, value]) => (value ?? "").trim().length === 0)
          .map(([key]) => key);
        expect(empty).toEqual([]);
      });

      test("uses the same {placeholders} as English", () => {
        const mismatches = Object.entries(dict)
          .filter(([key, value]) => {
            const enValue = EN[key] ?? "";
            return placeholders(enValue).join(",") !== placeholders(value ?? "").join(",");
          })
          .map(([key]) => key);
        expect(mismatches).toEqual([]);
      });
    });
  }

  test("English source has no empty strings", () => {
    const empty = Object.entries(EN)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
