import type { MessageKey } from "./en";

// Italian translations. Typed as a complete map of every MessageKey, so the
// compiler flags any key that is missing or removed.
//
// Language names (language.name.*) intentionally stay in their own language.
export const it: Record<MessageKey, string> = {
  "app.title": "MD380 Codeplug Editor",

  "language.label": "Lingua",
  "language.current": "Lingua attuale: {name}",
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Annulla",
  "common.apply": "Applica",
  "common.close": "Chiudi",
};
