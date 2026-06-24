# Internationalization (i18n) Plan

## Scope

Add multi-language UI support to the MD380 Codeplug Editor, starting with
**English (en)**, **Italian (it)**, and **French (fr)**.

The mechanism is a small, dependency-free `t()` translator with one typed
dictionary per locale. It slots directly into the existing
`store.subscribe` → full re-render model: changing the active locale is just
"set locale → re-render", identical to how tab switching already works.

## Principles

- **Dependency-free.** No i18n library; ~40 lines of code plus dictionaries.
- **Type-safe completeness.** English (`en.ts`) is the source of truth and
  defines `MessageKey`. Other locales are typed `Record<MessageKey, string>`,
  so a missing translation is a **compile-time error**.
- **Graceful fallback.** `t()` resolves: active locale → English → raw key.
  This means the app can ship partially migrated/translated at any point.
- **Translate UI chrome only.** Labels, buttons, tooltips, validation
  messages, toasts. **Never** translate codeplug data (channel/zone/contact
  names, frequencies) or device-stored radio menu/text content — those must
  stay byte-faithful per the round-trip fidelity rule.
- **Domain/UI separation preserved.** `validation.ts` keeps returning stable
  `code` + params; translation by `issue.code` happens in the UI layer.

## Architecture

```
web/src/i18n/
├── index.ts   # t(), setLocale(), initLocale(), Locale type, fallback + {var} interpolation
├── en.ts      # source of truth; exports `en` and `MessageKey = keyof typeof en`
├── it.ts      # Record<MessageKey, string>
└── fr.ts      # Record<MessageKey, string>
```

- `UiState.locale: Locale` holds the active language; persisted to
  `localStorage` and re-detected on startup (`localStorage` →
  `navigator.language` → `en`).
- Key namespacing: `tab.*`, `channels.*`, `zones.*`, `contacts.*`, `radio.*`,
  `callsign.*`, `dialog.*`, `validation.*`, `common.*`.
- Interpolation: `t("channels.count", { n: 12 })` against `"{n} channels"`.

## String inventory (where the work lives)

- `web/src/ui/codeplugEditor.ts` — largest; all editor tabs + header/top actions.
- `web/src/ui/landing.ts` — landing page + guide modals.
- `web/src/ui/dialog.ts` — toasts, confirm, membership picker.
- `web/src/ui/callsignWorkflow.ts`, `timeSyncWorkflow.ts`,
  `screenshotWorkflow.ts`, `firmwareWorkflow.ts` — workflow screens + toasts.
- `web/src/ui/uiHelpers.ts` — incidental status strings.
- `web/src/domain/validation.ts` — translate by `code` in the UI layer.

## Milestones

Each milestone is independently shippable (English fallback covers anything
not yet migrated or translated).

### M0 — Core i18n infrastructure
- Create `web/src/i18n/` (`index.ts`, `en.ts`, typed `it.ts`, `fr.ts`).
- Add `locale: Locale` to `UiState` + initializer; call `initLocale()` in `main.ts`.
- Fallback chain + `{var}` interpolation; unit test for `t()`.
- **Exit:** `t("app.title")` renders; switching `uiState.locale` swaps the string. `t()` unit tests pass.

### M1 — Language selector UI
- Header `<select>` (or flag buttons); on change → `setLocale`, persist, re-render.
- **Exit:** selecting IT/FR persists across reload; test asserts locale change + re-render.

### M2 — Key convention + completeness gate
- Finalize namespacing; CI/test fails if `it`/`fr` miss any `MessageKey`.
- **Exit:** build fails on missing key; convention documented.

### M3 — Migrate navigation shell + landing (EN keys)
- Tab labels, header/top actions, landing page, guide modals.
- **Exit:** shell + landing render via `t()`; tests query by id, not English text.

### M4 — Migrate codeplug editor tabs (EN keys) — done tab by tab
- Order: Channels → Zones → Scan Lists → Group Lists → Digital Contacts →
  General → Menus → Buttons → DTMF → One Touch → Digital Text → Encryption →
  Radio Transfer.
- UI chrome only; codeplug data untouched.
- **Exit:** each tab renders via `t()`; round-trip/fidelity tests green.

### M5 — Dialogs, workflows & validation messages
- `dialog.ts`, all `*Workflow.ts`; validation translated by `issue.code` with interpolation.
- **Exit:** all toasts/confirms/validation via `t()`; grep gate finds no hardcoded UI English.

### M6 — Italian translation pass
- Fill every key in `it.ts`; native review of radio-domain terms.
- **Exit:** app fully usable in Italian; no truncation/overflow.

### M7 — French translation pass
- Fill every key in `fr.ts`; native review.
- **Exit:** app fully usable in French; layout check.

### M8 — Polish & QA
- `<html lang>` per locale; `aria-label`s/tooltips; `Intl` date/number formatting.
- Long-string layout audit; README/roadmap update; full suite green in all locales.
- **Exit:** CI enforces key completeness; no overflow/clipping.

## Sequencing notes

- M0–M2 are foundational and quick; **M4 is the heavy lift** (multiple sub-PRs).
- Shippable after **M3** (shell localized, rest English-fallback).
- Translation passes (M6/M7) can run in parallel with M4/M5 — they only need
  keys to exist in `en.ts`.

## Definition of Done (per milestone)

- ✓ Preserves codeplug/callsign domain separation; no device data translated.
- ✓ Type-safe: all locales satisfy `Record<MessageKey, string>`.
- ✓ Tests updated to assert via ids/keys, not hardcoded English.
- ✓ Round-trip fidelity unaffected.
- ✓ No regressions in the full Vitest suite.
