/**
 * Translation completeness gate (M2).
 *
 * Enforces, at test time, the invariants that the type system cannot fully
 * express:
 *   - Every locale defines exactly the same set of keys as English (no missing,
 *     no extra). Missing keys are also a compile error via Record<MessageKey,…>,
 *     but this catches accidental extras and keeps the guarantee explicit.
 *   - No translation is an empty/whitespace-only string.
 *   - Every locale uses the same {placeholder} tokens as the English source, so
 *     interpolation never silently breaks in a translation.
 */
import { describe, expect, it as test } from "vitest";

import { en } from "./en";
import { it } from "./it";
import { fr } from "./fr";

type Dictionary = Record<string, string>;

const LOCALES: Record<string, Dictionary> = { it, fr };
const EN: Dictionary = en;

function sortedKeys(dict: Dictionary): string[] {
  return Object.keys(dict).sort();
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("translation completeness", () => {
  for (const [locale, dict] of Object.entries(LOCALES)) {
    describe(`locale "${locale}"`, () => {
      test("defines exactly the same keys as English", () => {
        expect(sortedKeys(dict)).toEqual(sortedKeys(EN));
      });

      test("has no empty translations", () => {
        const empty = Object.entries(dict)
          .filter(([, value]) => value.trim().length === 0)
          .map(([key]) => key);
        expect(empty).toEqual([]);
      });

      test("uses the same {placeholders} as English", () => {
        const mismatches = Object.entries(EN)
          .filter(([key, enValue]) => {
            const translated = dict[key] ?? "";
            return placeholders(enValue).join(",") !== placeholders(translated).join(",");
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
