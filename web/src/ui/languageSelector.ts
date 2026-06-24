import type { AppState, EditorStore } from "../state/store";
import type { ChannelPanelState, UiState } from "./uiTypes";
import { SUPPORTED_LOCALES, isLocale, setLocale, t, type MessageKey } from "../i18n";

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

// Renders the language picker shown in the app header (both the landing page
// and the loaded editor). Option labels show each language in its own name.
export function renderLanguageSelector(uiState: UiState): string {
  const options = SUPPORTED_LOCALES.map((locale) => {
    const selected = locale === uiState.locale ? " selected" : "";
    const name = t(`language.name.${locale}` as MessageKey);
    return `<option value="${locale}"${selected}>${name}</option>`;
  }).join("");

  return `
    <div class="language-selector">
      <label class="language-selector-label" for="language-select">${t("language.label")}</label>
      <select id="language-select" aria-label="${t("language.label")}">
        ${options}
      </select>
    </div>
  `;
}

// Wires the language picker: changing it persists the choice and re-renders the
// whole app so every translated string updates immediately.
export function bindLanguageSelector(
  target: HTMLElement,
  store: EditorStore,
  _state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  const select = target.querySelector<HTMLSelectElement>("#language-select");
  if (!select) {
    return;
  }

  select.addEventListener("change", () => {
    const value = select.value;
    if (!isLocale(value) || value === uiState.locale) {
      return;
    }
    setLocale(value);
    uiState.locale = value;
    renderState(target, store, store.getState(), channelState, uiState);
  });
}
