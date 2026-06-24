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
//
// Key naming convention (enforced by review + completeness.test.ts):
//   - Lower camelCase segments joined by dots: "<area>.<thing>[.<detail>]".
//   - First segment is the area/namespace:
//       app.*        — global app shell (title, etc.)
//       common.*     — generic reusable words (cancel, apply, close…)
//       language.*   — language picker
//       tab.*        — tab button labels
//       channels.*   — channels editor
//       zones.*      — zones editor
//       scanLists.*  — scan lists editor
//       groupLists.* — group lists editor
//       contacts.*   — digital contacts editor
//       general.*    — general settings
//       radio.*      — radio transfer
//       callsign.*   — callsign workflow
//       dialog.*     — toasts / confirms / pickers
//       validation.* — validation messages (keyed by issue code)
//   - Interpolation uses {name}-style tokens; the SAME tokens must appear in
//     every locale's translation of that key.
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
