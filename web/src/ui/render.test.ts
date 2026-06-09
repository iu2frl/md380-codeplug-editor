/**
 * Render integration tests.
 *
 * Verifies that the zone and channel tabs produce visible list items and editor
 * fields when a document is loaded.  These tests caught the regression where
 * `uiState` was not passed to `renderActiveTab`, causing both tabs to render
 * empty.
 *
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { EditorStore } from "../state/store";
import { renderApp } from "./render";
import type { CodeplugDocument } from "../domain/types";

// ---------------------------------------------------------------------------
// Minimal fixture document
// ---------------------------------------------------------------------------

function makeDocument(): CodeplugDocument {
  return {
    fileName: "test.rdt",
    format: "rdt",
    variant: "D",
    sourceSize: 262709,
    outputFileName: "test.rdt",
    payloadOffset: 549,
    payloadLength: 262144,
    model: "MD380",
    settings: { radioId: 1234567, radioName: "TESTUSER" },
    channels: [
      {
        id: 1,
        name: "Alpha",
        rxFrequencyMHz: 438.0125,
        txFrequencyMHz: 438.0125,
        channelMode: "Digital",
        colorCode: 1,
        repeaterSlot: 1,
        bandwidthKhz: "12.5",
        power: "High",
        contactId: 1,
      },
      {
        id: 2,
        name: "Bravo",
        rxFrequencyMHz: 145.5,
        txFrequencyMHz: 145.5,
        channelMode: "Analog",
        colorCode: 0,
        repeaterSlot: 1,
        bandwidthKhz: "25",
        power: "Low",
      },
    ],
    zones: [
      { id: 1, name: "Zone One", channelIds: [1, 2] },
      { id: 2, name: "Zone Two", channelIds: [1] },
    ],
    contacts: [{ id: 1, name: "TG9", callId: 9 }],
    groupLists: [],
    scanLists: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountApp(): { container: HTMLElement; store: EditorStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const store = new EditorStore();
  renderApp(container, store);
  return { container, store };
}

function click(container: Element, selector: string): void {
  const el = container.querySelector(selector);
  if (!el) throw new Error(`click: element not found: ${selector}`);
  (el as HTMLElement).dispatchEvent(new Event("click", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("zones tab", () => {
  let container: HTMLElement;
  let store: EditorStore;

  beforeEach(() => {
    document.body.innerHTML = "";
    ({ container, store } = mountApp());
    store.loadDocument(makeDocument());
  });

  it("renders a list item for each zone", () => {
    click(container, '[data-tab="zones"]');
    const items = container.querySelectorAll("[data-zone-select]");
    expect(items.length).toBe(2);
  });

  it("shows zone names in list items", () => {
    click(container, '[data-tab="zones"]');
    const names = [...container.querySelectorAll("[data-zone-select] .list-item-name")].map(
      (el) => el.textContent,
    );
    expect(names).toContain("Zone One");
    expect(names).toContain("Zone Two");
  });

  it("shows editor fields after selecting a zone", () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    expect(container.querySelector("#zone-editor-name")).not.toBeNull();
    expect(container.querySelector("#zone-editor-channels")).not.toBeNull();
  });

  it("selected zone editor name matches the zone name", () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    const input = container.querySelector<HTMLInputElement>("#zone-editor-name");
    expect(input?.value).toBe("Zone One");
  });
});

describe("channels tab", () => {
  let container: HTMLElement;
  let store: EditorStore;

  beforeEach(() => {
    document.body.innerHTML = "";
    ({ container, store } = mountApp());
    store.loadDocument(makeDocument());
  });

  it("renders a list item for each channel", () => {
    click(container, '[data-tab="channels"]');
    const items = container.querySelectorAll("[data-channel-select]");
    expect(items.length).toBe(2);
  });

  it("shows channel names in list items", () => {
    click(container, '[data-tab="channels"]');
    const names = [...container.querySelectorAll("[data-channel-select] .list-item-name")].map(
      (el) => el.textContent,
    );
    expect(names).toContain("Alpha");
    expect(names).toContain("Bravo");
  });

  it("shows editor fields after selecting a channel", () => {
    click(container, '[data-tab="channels"]');
    click(container, '[data-channel-select="1"]');
    expect(container.querySelector("#channel-editor-name")).not.toBeNull();
    expect(container.querySelector("#channel-editor-rx")).not.toBeNull();
  });

  it("selected channel editor name matches the channel name", () => {
    click(container, '[data-tab="channels"]');
    click(container, '[data-channel-select="1"]');
    const input = container.querySelector<HTMLInputElement>("#channel-editor-name");
    expect(input?.value).toBe("Alpha");
  });

  it("channel list filters by search query", () => {
    click(container, '[data-tab="channels"]');
    const searchInput = container.querySelector<HTMLInputElement>("#channel-search");
    if (!searchInput) throw new Error("search input not found");
    searchInput.value = "Alpha";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    const items = container.querySelectorAll("[data-channel-select]");
    expect(items.length).toBe(1);
  });
});

