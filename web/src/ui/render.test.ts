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
    basicInfo: {
      firmwareVersion: "Not stored in codeplug",
      cpsVersion: "1012",
      mcuVersion: "Not stored in codeplug",
      uniqueDeviceId: "Not stored in codeplug",
      frequencyRange: "400-480",
      lastProgrammedTime: "2024-06-09 12:30:45",
    },
    settings: {
      radioId: 1234567,
      radioName: "TESTUSER",
      voxSensitivity: 5,
      txPreambleDurationMs: 600,
      rxLowBatteryIntervalSec: 30,
      backlightTimeoutSec: "Always",
      keypadAutoLockSec: "Manual",
      bootUpMessageLine1: "HELLO",
      bootUpMessageLine2: "WORLD",
      alertTones: "On",
      timeZone: "UTC+8:00",
    },
    menuSettings: {
      hangTime: "10",
      radioDisable: "Off",
      radioEnable: "Off",
      remoteMonitor: "Off",
      radioCheck: "Off",
      manualDial: "On",
      edit: "On",
      callAlert: "On",
      textMessage: "On",
      toneOrAlert: "On",
      talkaround: "On",
      outgoingRadio: "On",
      answered: "On",
      missed: "On",
      editList: "On",
      scan: "On",
      programKey: "On",
      vox: "Off",
      squelch: "On",
      ledIndicator: "On",
      keyboardLock: "On",
      introScreen: "On",
      backlight: "On",
      power: "On",
      gps: "Off",
      programRadio: "Off",
      displayMode: "On",
      passwordAndLock: "On",
    },
    radioButtons: [
      { id: 1, name: "Side Button 1 Short Press", actionCode: 0 },
      { id: 2, name: "Side Button 1 Long Press", actionCode: 14 },
      { id: 3, name: "Side Button 2 Short Press", actionCode: 4 },
      { id: 4, name: "Side Button 2 Long Press", actionCode: 5 },
    ],
    longPressDurationMs: 1000,
    textMessages: [{ id: 1, text: "Hello world", slot: 1 }],
    privacySettings: {
      enhancedKeys: Array.from({ length: 8 }, () => "ffffffffffffffffffffffffffffffff"),
      basicKeys: Array.from({ length: 16 }, () => "ffff"),
    },
    channels: [
      {
        id: 1,
        name: "Alpha",
        rxFrequencyMHz: 438.0125,
        txFrequencyMHz: 438.0125,
        txOffsetMHz: 0,
        channelMode: "Digital",
        admitCriteria: "Always",
        inCallCriteria: "Always",
        rxOnly: "Off",
        autoscan: "Off",
        loneWorker: "Off",
        vox: "Off",
        allowTalkaround: "Off",
        talkaround: "Off",
        privateCallConfirmed: "Off",
        dataCallConfirmed: "Off",
        emergencyAlarmAck: "Off",
        compressedUdpDataHeader: "On",
        displayPttId: "Off",
        privacy: "None",
        privacyNumber: 1,
        emergencySystem: 0,
        totSec: 60,
        totRekeyDelaySec: 0,
        rxRefFrequency: "Low",
        txRefFrequency: "Low",
        rxSignallingSystem: "Off",
        txSignallingSystem: "Off",
        ctcssDecode: "None",
        ctcssEncode: "None",
        qtReverse: "180",
        reverseBurst: "On",
        decode1: "Off",
        decode2: "Off",
        decode3: "Off",
        decode4: "Off",
        decode5: "Off",
        decode6: "Off",
        decode7: "Off",
        decode8: "Off",
        dcdmSwitch: "Off",
        leaderMs: "Off",
        allowInterrupt: "Off",
        nonQtDqtTurnoffFreq: "None",
        receiveGpsInfo: "Off",
        sendGpsInfo: "Off",
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
        txOffsetMHz: 0,
        channelMode: "Analog",
        admitCriteria: "Always",
        inCallCriteria: "Always",
        rxOnly: "Off",
        autoscan: "Off",
        loneWorker: "Off",
        vox: "Off",
        allowTalkaround: "Off",
        talkaround: "Off",
        privateCallConfirmed: "Off",
        dataCallConfirmed: "Off",
        emergencyAlarmAck: "Off",
        compressedUdpDataHeader: "On",
        displayPttId: "Off",
        privacy: "None",
        privacyNumber: 1,
        emergencySystem: 0,
        totSec: 60,
        totRekeyDelaySec: 0,
        rxRefFrequency: "Low",
        txRefFrequency: "Low",
        rxSignallingSystem: "Off",
        txSignallingSystem: "Off",
        ctcssDecode: "None",
        ctcssEncode: "None",
        qtReverse: "180",
        reverseBurst: "On",
        decode1: "Off",
        decode2: "Off",
        decode3: "Off",
        decode4: "Off",
        decode5: "Off",
        decode6: "Off",
        decode7: "Off",
        decode8: "Off",
        dcdmSwitch: "Off",
        leaderMs: "Off",
        allowInterrupt: "Off",
        nonQtDqtTurnoffFreq: "None",
        receiveGpsInfo: "Off",
        sendGpsInfo: "Off",
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
    expect(container.querySelector("[data-zone-channel-toggle]")).not.toBeNull();
    expect(container.querySelector("#zone-selected-channels")).not.toBeNull();
  });

  it("selected zone editor name matches the zone name", () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    const input = container.querySelector<HTMLInputElement>("#zone-editor-name");
    expect(input?.value).toBe("Zone One");
  });

  it("renders zone selected list controls for sorting", () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    expect(container.querySelector('[data-zone-channel-up="2"]')).not.toBeNull();
    expect(container.querySelector('[data-zone-channel-down="1"]')).not.toBeNull();
    expect(container.querySelector('[data-zone-channel-remove="1"]')).not.toBeNull();
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

  it("keeps focus in search input while typing", () => {
    click(container, '[data-tab="channels"]');
    const searchInput = container.querySelector<HTMLInputElement>("#channel-search");
    if (!searchInput) throw new Error("search input not found");

    searchInput.focus();
    searchInput.value = "A";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    const rerenderedInput = container.querySelector<HTMLInputElement>("#channel-search");
    expect(rerenderedInput).not.toBeNull();
    expect(document.activeElement).toBe(rerenderedInput);
  });

  it("preserves channels list scroll when editing a channel", () => {
    click(container, '[data-tab="channels"]');
    click(container, '[data-channel-select="1"]');

    const listBefore = container.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (!listBefore) throw new Error("channels list not found");
    listBefore.scrollTop = 180;

    const nameInput = container.querySelector<HTMLInputElement>("#channel-editor-name");
    if (!nameInput) throw new Error("channel editor name input not found");
    nameInput.value = "Alpha Updated";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));

    const listAfter = container.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (!listAfter) throw new Error("channels list not found after rerender");
    expect(listAfter.scrollTop).toBe(180);
  });
});

describe("newly enabled tabs", () => {
  let container: HTMLElement;
  let store: EditorStore;

  beforeEach(() => {
    document.body.innerHTML = "";
    ({ container, store } = mountApp());
    store.loadDocument(makeDocument());
  });

  it("renders menu controls", () => {
    click(container, '[data-tab="menus"]');
    expect(container.querySelector("#menu-hang-time")).not.toBeNull();
    expect(container.querySelector('[data-menu-toggle="scan"]')).not.toBeNull();
  });

  it("renders buttons/text/encryption controls", () => {
    click(container, '[data-tab="buttons"]');
    expect(container.querySelector("#long-press-duration")).not.toBeNull();
    expect(container.querySelector('[data-radio-button="1"]')).not.toBeNull();

    click(container, '[data-tab="digital-text"]');
    expect(container.querySelector("#add-text-message")).not.toBeNull();
    expect(container.querySelector("[data-text-message]")).not.toBeNull();

    click(container, '[data-tab="encryption"]');
    expect(container.querySelector("[data-enhanced-key]")).not.toBeNull();
    expect(container.querySelector("[data-basic-key]")).not.toBeNull();
  });

  it("renders radio transfer panel", () => {
    click(container, '[data-tab="radio-transfer"]');
    expect(container.querySelector("#radio-transfer-connect")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-read")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-write")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-progress")).not.toBeNull();
    expect(container.textContent).toContain("Radio Transfer");
  });
});

describe("landing entrypoints", () => {
  it("shows create, upload, and read-from-radio entrypoints", () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    expect(container.querySelector("#create-new-btn")).not.toBeNull();
    expect(container.querySelector("#open-existing-btn")).not.toBeNull();
    expect(container.querySelector("#landing-read-radio-btn")).not.toBeNull();
    expect(container.querySelector("#landing-radio-progress")).toBeNull();
  });

  it("keeps all landing buttons disabled until risk checkbox is selected", () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    const createButton = container.querySelector<HTMLButtonElement>("#create-new-btn");
    const openButton = container.querySelector<HTMLButtonElement>("#open-existing-btn");
    const readButton = container.querySelector<HTMLButtonElement>("#landing-read-radio-btn");
    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");

    expect(createButton?.disabled).toBe(true);
    expect(openButton?.disabled).toBe(true);
    expect(readButton?.disabled).toBe(true);

    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    expect(container.querySelector<HTMLButtonElement>("#create-new-btn")?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>("#open-existing-btn")?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>("#landing-read-radio-btn")?.disabled).toBe(false);
  });
});

