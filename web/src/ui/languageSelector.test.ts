/**
 * Language selector (M1) integration tests.
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "../state/store";
import { renderApp } from "./render";
import { LOCALE_STORAGE_KEY, setLocale } from "../i18n";

function mountApp(): { container: HTMLElement; store: EditorStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const store = new EditorStore();
  renderApp(container, store);
  return { container, store };
}

function changeLocale(container: HTMLElement, value: string): void {
  const select = container.querySelector<HTMLSelectElement>("#language-select");
  if (!select) throw new Error("language select not found");
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  setLocale("en");
  // Rendering the landing page fires a fire-and-forget fetch for callsign
  // metadata. Stub it so the suite stays hermetic (no real network request)
  // and happy-dom does not log an AbortError when it cancels the pending
  // request during environment teardown.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
});

afterEach(() => {
  localStorage.clear();
  setLocale("en");
  vi.unstubAllGlobals();
});

describe("language selector", () => {
  it("renders on the landing page with all supported locales", () => {
    const { container } = mountApp();
    const select = container.querySelector<HTMLSelectElement>("#language-select");
    expect(select).not.toBeNull();
    const values = [...select!.options].map((option) => option.value);
    expect(values).toEqual(["en", "it", "fr"]);
    expect(select!.value).toBe("en");
  });

  it("persists the chosen locale and re-renders translated chrome", () => {
    const { container } = mountApp();

    changeLocale(container, "it");

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("it");
    const label = container.querySelector(".language-selector-label");
    expect(label?.textContent?.trim()).toBe("Lingua");
    // The select still reflects the active locale after the re-render.
    const select = container.querySelector<HTMLSelectElement>("#language-select");
    expect(select?.value).toBe("it");
  });

  it("switches to French", () => {
    const { container } = mountApp();
    changeLocale(container, "fr");
    const label = container.querySelector(".language-selector-label");
    expect(label?.textContent?.trim()).toBe("Langue");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr");
  });

  it("keeps the selector available after a document is loaded", () => {
    const { container, store } = mountApp();
    store.loadDocument({
      fileName: "x.rdt",
      format: "rdt",
      variant: "D",
      sourceSize: 262709,
      outputFileName: "x.rdt",
      payloadOffset: 549,
      payloadLength: 262144,
      model: "MD380",
      basicInfo: {
        firmwareVersion: "",
        cpsVersion: "",
        mcuVersion: "",
        uniqueDeviceId: "",
        frequencyRange: "",
        lastProgrammedTime: "",
      },
      settings: {
        radioId: 1,
        radioName: "A",
        voxSensitivity: 1,
        txPreambleDurationMs: 0,
        rxLowBatteryIntervalSec: 0,
        backlightTimeoutSec: "Always",
        keypadAutoLockSec: "Manual",
        bootUpMessageLine1: "",
        bootUpMessageLine2: "",
        alertTones: "On",
        timeZone: "UTC+0:00",
      },
      menuSettings: {} as never,
      buttonSettings: {} as never,
      channels: [],
      zones: [],
      scanLists: [],
      groupLists: [],
      contacts: [],
      rawRecords: {} as never,
    } as never);

    const select = container.querySelector<HTMLSelectElement>("#language-select");
    expect(select).not.toBeNull();
    changeLocale(container, "fr");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr");
  });
});
