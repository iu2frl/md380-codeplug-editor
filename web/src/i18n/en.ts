// English is the single source of truth for all UI message keys.
//
// `MessageKey` is derived from this object, so every other locale dictionary
// (it.ts, fr.ts) is type-checked to provide exactly the same set of keys.
// When adding a new UI string:
//   1. Add the key here (English text).
//   2. Add the same key to it.ts and fr.ts (translated, or English placeholder
//      until the translation pass).
//
// Only translate UI chrome. Never add keys for codeplug data (channel/zone/
// contact names, frequencies) or device-stored radio text — those stay
// byte-faithful and untranslated.
export const en = {
  "app.title": "MD380 Codeplug Editor",

  "language.label": "Language",
  "language.current": "Current language: {name}",
  // Language names are shown in their own language regardless of active locale.
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Cancel",
  "common.apply": "Apply",
  "common.close": "Close",
} as const;

export type MessageKey = keyof typeof en;
