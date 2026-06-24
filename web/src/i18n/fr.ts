import type { MessageKey } from "./en";

// French translations. Typed as a complete map of every MessageKey, so the
// compiler flags any key that is missing or removed.
//
// Language names (language.name.*) intentionally stay in their own language.
export const fr: Record<MessageKey, string> = {
  "app.title": "MD380 Codeplug Editor",

  "language.label": "Langue",
  "language.current": "Langue actuelle : {name}",
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Annuler",
  "common.apply": "Appliquer",
  "common.close": "Fermer",
};
