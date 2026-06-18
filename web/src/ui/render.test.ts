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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "../state/store";
import * as browserRadio from "../transport/browserRadio";
import * as dialog from "./dialog";
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
      { id: 4, name: "Side Button 2 Long Press", actionCode: 55 },
    ],
    longPressDurationMs: 1000,
    textMessages: [{ id: 1, text: "Hello world", slot: 1 }],
    privacySettings: {
      enhancedKeys: Array.from({ length: 8 }, () => "ffffffffffffffffffffffffffffffff"),
      basicKeys: Array.from({ length: 16 }, () => "ffff"),
    },
    numberKeys: Array.from({ length: 10 }, (_, slot) => ({ slot })),
    oneTouchActions: Array.from({ length: 6 }, (_, index) => ({
      slot: index + 1,
      mode: "None" as const,
      callType: "Call" as const,
      dtmfSystem: "DTMF-1" as const,
    })),
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
        scanListId: 1,
        groupListId: 1,
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
    groupLists: [{ id: 1, name: "North Group", contactIds: [1] }],
    scanLists: [{ id: 1, name: "City Scan", txDesignatedChannelMode: "Last Active Channel", signalingHoldTimeMs: 500, prioritySampleTimeMs: 2000, channelIds: [1] }],
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

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.restoreAllMocks();
});

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
    expect(container.querySelector("#zone-edit-channels")).not.toBeNull();
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

  it("edits zone channels through the membership picker and applies changes", async () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    click(container, "#zone-edit-channels");

    const picker = document.body.querySelector<HTMLElement>(".picker-card");
    expect(picker).not.toBeNull();

    // Deselect channel #2, keep #1, then apply.
    const toggle = picker?.querySelector<HTMLInputElement>('input[data-picker-id="2"]');
    expect(toggle?.checked).toBe(true);
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event("change", { bubbles: true }));

    picker?.querySelector<HTMLButtonElement>(".picker-apply")?.click();
    await Promise.resolve();

    const zone = store.getState().document?.zones.find((item) => item.id === 1);
    expect(zone?.channelIds).toEqual([1]);
  });

  it("discards picker changes when cancelled", async () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    click(container, "#zone-edit-channels");

    const picker = document.body.querySelector<HTMLElement>(".picker-card");
    const toggle = picker?.querySelector<HTMLInputElement>('input[data-picker-id="2"]');
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event("change", { bubbles: true }));

    picker?.querySelector<HTMLButtonElement>(".picker-cancel")?.click();
    await Promise.resolve();

    const zone = store.getState().document?.zones.find((item) => item.id === 1);
    expect(zone?.channelIds).toEqual([1, 2]);
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

  it("shows bulk controls without selecting a channel", () => {
    click(container, '[data-tab="channels"]');
    const bulkCard = container.querySelector<HTMLDetailsElement>("#bulk-editor-card");
    expect(bulkCard).not.toBeNull();
    expect(bulkCard?.open).toBe(false);

    bulkCard?.setAttribute("open", "");
    bulkCard?.dispatchEvent(new Event("toggle"));

    expect(container.querySelector("#apply-bulk")).not.toBeNull();
    expect(container.querySelector("#bulk-target")).not.toBeNull();
    expect(container.querySelector("#bulk-bandwidth")).not.toBeNull();
  });

  it("applies bulk patch to filtered channels", () => {
    click(container, '[data-tab="channels"]');

    const bulkCard = container.querySelector<HTMLDetailsElement>("#bulk-editor-card");
    bulkCard?.setAttribute("open", "");
    bulkCard?.dispatchEvent(new Event("toggle"));

    const searchInput = container.querySelector<HTMLInputElement>("#channel-search");
    if (!searchInput) throw new Error("search input not found");
    searchInput.value = "Alpha";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    const bandwidth = container.querySelector<HTMLSelectElement>("#bulk-bandwidth");
    const slot = container.querySelector<HTMLSelectElement>("#bulk-slot");
    const colorCode = container.querySelector<HTMLInputElement>("#bulk-color-code");
    if (!bandwidth || !slot || !colorCode) throw new Error("bulk controls not found");

    bandwidth.value = "20";
    bandwidth.dispatchEvent(new Event("change", { bubbles: true }));
    slot.value = "2";
    slot.dispatchEvent(new Event("change", { bubbles: true }));
    colorCode.value = "7";
    colorCode.dispatchEvent(new Event("input", { bubbles: true }));

    click(container, "#apply-bulk");

    const snapshot = store.getState();
    const alpha = snapshot.document?.channels.find((channel) => channel.id === 1);
    const bravo = snapshot.document?.channels.find((channel) => channel.id === 2);
    expect(alpha?.bandwidthKhz).toBe("20");
    expect(alpha?.repeaterSlot).toBe(2);
    expect(alpha?.colorCode).toBe(7);
    expect(bravo?.bandwidthKhz).toBe("25");
    expect(bravo?.repeaterSlot).toBe(1);
    expect(bravo?.colorCode).toBe(0);
  });

  it("applies bulk RX and shift and derives TX", () => {
    click(container, '[data-tab="channels"]');

    const bulkCard = container.querySelector<HTMLDetailsElement>("#bulk-editor-card");
    bulkCard?.setAttribute("open", "");
    bulkCard?.dispatchEvent(new Event("toggle"));

    const searchInput = container.querySelector<HTMLInputElement>("#channel-search");
    if (!searchInput) throw new Error("search input not found");
    searchInput.value = "Alpha";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    const rx = container.querySelector<HTMLInputElement>("#bulk-rx-frequency");
    const offset = container.querySelector<HTMLInputElement>("#bulk-tx-offset");
    if (!rx || !offset) throw new Error("bulk frequency controls not found");

    rx.value = "430.125";
    rx.dispatchEvent(new Event("input", { bubbles: true }));
    offset.value = "5";
    offset.dispatchEvent(new Event("input", { bubbles: true }));

    click(container, "#apply-bulk");

    const snapshot = store.getState();
    const alpha = snapshot.document?.channels.find((channel) => channel.id === 1);
    const bravo = snapshot.document?.channels.find((channel) => channel.id === 2);
    expect(alpha?.rxFrequencyMHz).toBeCloseTo(430.125, 6);
    expect(alpha?.txOffsetMHz).toBeCloseTo(5, 6);
    expect(alpha?.txFrequencyMHz).toBeCloseTo(435.125, 6);
    expect(bravo?.rxFrequencyMHz).toBeCloseTo(145.5, 6);
    expect(bravo?.txOffsetMHz).toBeCloseTo(0, 6);
    expect(bravo?.txFrequencyMHz).toBeCloseTo(145.5, 6);
  });

  it("derives tx from rx and offset across repeated bulk updates", () => {
    click(container, '[data-tab="channels"]');

    const bulkCard = container.querySelector<HTMLDetailsElement>('#bulk-editor-card');
    bulkCard?.setAttribute('open', '');
    bulkCard?.dispatchEvent(new Event('toggle'));

    const searchInput = container.querySelector<HTMLInputElement>('#channel-search');
    if (!searchInput) throw new Error('search input not found');
    searchInput.value = 'Alpha';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    const rx = container.querySelector<HTMLInputElement>('#bulk-rx-frequency');
    const offset = container.querySelector<HTMLInputElement>('#bulk-tx-offset');
    if (!rx || !offset) throw new Error('bulk frequency controls not found');

    rx.value = '430.125';
    rx.dispatchEvent(new Event('input', { bubbles: true }));
    click(container, '#apply-bulk');

    let snapshot = store.getState();
    let alpha = snapshot.document?.channels.find((channel) => channel.id === 1);
    expect(alpha?.rxFrequencyMHz).toBeCloseTo(430.125, 6);
    expect(alpha?.txOffsetMHz).toBeCloseTo(0, 6);
    expect(alpha?.txFrequencyMHz).toBeCloseTo(430.125, 6);

    const offsetAgain = container.querySelector<HTMLInputElement>('#bulk-tx-offset');
    if (!offsetAgain) throw new Error('bulk offset control not found after apply');
    offsetAgain.value = '5';
    offsetAgain.dispatchEvent(new Event('input', { bubbles: true }));

    click(container, '#apply-bulk');

    snapshot = store.getState();
    alpha = snapshot.document?.channels.find((channel) => channel.id === 1);
    const bravo = snapshot.document?.channels.find((channel) => channel.id === 2);
    expect(alpha?.rxFrequencyMHz).toBeCloseTo(430.125, 6);
    expect(alpha?.txOffsetMHz).toBeCloseTo(5, 6);
    expect(alpha?.txFrequencyMHz).toBeCloseTo(435.125, 6);
    expect(bravo?.rxFrequencyMHz).toBeCloseTo(145.5, 6);
    expect(bravo?.txOffsetMHz).toBeCloseTo(0, 6);
    expect(bravo?.txFrequencyMHz).toBeCloseTo(145.5, 6);
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
    expect(container.querySelector<HTMLSelectElement>('[data-radio-button="4"]')?.value).toBe("55");

    click(container, '[data-tab="digital-text"]');
    expect(container.querySelector("#add-text-message")).not.toBeNull();
    expect(container.querySelector("[data-text-message]")).not.toBeNull();

    click(container, '[data-tab="encryption"]');
    expect(container.querySelector("[data-enhanced-key]")).not.toBeNull();
    expect(container.querySelector("[data-basic-key]")).not.toBeNull();
  });

  it("renders editable group and scan list tabs", () => {
    click(container, '[data-tab="group-lists"]');
    expect(container.querySelector("#add-group-list")).not.toBeNull();
    expect(container.querySelector('[data-group-list-select="1"]')).not.toBeNull();

    click(container, '[data-tab="scan-lists"]');
    expect(container.querySelector("#add-scan-list")).not.toBeNull();
    // With the new UI, scan lists are shown as selectable items, so look for the selector
    expect(container.querySelector('[data-scan-list-select="1"]')).not.toBeNull();
  });

  it("adds, updates, and removes group and scan lists", async () => {
    click(container, '[data-tab="group-lists"]');

    click(container, "#add-group-list");
    let snapshot = store.getState();
    expect(snapshot.document?.groupLists).toHaveLength(2);

    click(container, '[data-group-list-select="2"]');
    const groupNameInput = container.querySelector<HTMLInputElement>('[data-group-list-name="2"]');
    if (!groupNameInput) throw new Error("group list input not found");
    groupNameInput.value = "Travel Group";
    groupNameInput.dispatchEvent(new Event("change", { bubbles: true }));

    snapshot = store.getState();
    expect(snapshot.document?.groupLists.find((item) => item.id === 2)?.name).toBe("Travel Group");

    const confirmSpy = vi.spyOn(dialog, "showConfirm").mockResolvedValue(true);
    click(container, '[data-group-list-select="1"]');
    click(container, '#group-list-editor-delete');
    await Promise.resolve();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    snapshot = store.getState();
    expect(snapshot.document?.groupLists.some((item) => item.id === 1)).toBe(false);
    expect(snapshot.document?.channels.find((item) => item.id === 1)?.groupListId).toBeUndefined();

    click(container, '[data-tab="scan-lists"]');

    click(container, "#add-scan-list");
    snapshot = store.getState();
    expect(snapshot.document?.scanLists).toHaveLength(2);

    // Select the newly added scan list
    click(container, '[data-scan-list-select="2"]');

    const scanNameInput = container.querySelector<HTMLInputElement>('[data-scan-list-name="2"]');
    if (!scanNameInput) throw new Error("scan list input not found");
    scanNameInput.value = "Travel Scan";
    scanNameInput.dispatchEvent(new Event("change", { bubbles: true }));

    snapshot = store.getState();
    expect(snapshot.document?.scanLists.find((item) => item.id === 2)?.name).toBe("Travel Scan");

    // Delete requires selecting the scan list first
    click(container, '[data-scan-list-select="1"]');
    click(container, '#scan-list-editor-delete');
    await Promise.resolve();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    snapshot = store.getState();
    expect(snapshot.document?.scanLists.some((item) => item.id === 1)).toBe(false);
    expect(snapshot.document?.channels.find((item) => item.id === 1)?.scanListId).toBeUndefined();
  });

  it("opens the zone channel picker with a 16-channel limit", () => {
    click(container, '[data-tab="zones"]');
    click(container, '[data-zone-select="1"]');
    click(container, "#zone-edit-channels");

    const counter = document.body.querySelector<HTMLElement>(".picker-card .picker-counter");
    expect(counter?.textContent).toContain("/16 channels selected");

    document.body.querySelector<HTMLButtonElement>(".picker-cancel")?.click();
  });

  it("opens the scan list channel picker with a 31-channel limit", () => {
    click(container, '[data-tab="scan-lists"]');
    click(container, '[data-scan-list-select="1"]');
    click(container, "#scan-list-edit-channels");

    const counter = document.body.querySelector<HTMLElement>(".picker-card .picker-counter");
    expect(counter?.textContent).toContain("/31 channels selected");

    document.body.querySelector<HTMLButtonElement>(".picker-cancel")?.click();
  });

  it("opens the group list contact picker with a 32-contact limit", () => {
    click(container, '[data-tab="group-lists"]');
    click(container, '[data-group-list-select="1"]');
    click(container, "#group-list-edit-contacts");

    const counter = document.body.querySelector<HTMLElement>(".picker-card .picker-counter");
    expect(counter?.textContent).toContain("/32 contacts selected");

    document.body.querySelector<HTMLButtonElement>(".picker-cancel")?.click();
  });

  it("renders radio transfer panel", () => {
    click(container, '[data-tab="radio-transfer"]');
    expect(container.querySelector("#radio-transfer-connect")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-read")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-write")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-setup-guide-btn")).not.toBeNull();
    expect(container.querySelector("#radio-transfer-progress")).not.toBeNull();
    expect(container.textContent).toContain("Radio Transfer");
  });

  it("opens full setup guide popup from radio transfer", () => {
    click(container, '[data-tab="radio-transfer"]');
    click(container, "#radio-transfer-setup-guide-btn");

    const modal = container.querySelector("#guide-modal");
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain("WebUSB Setup Guide");
    expect(modal?.textContent).toContain("Windows Setup");
    expect(modal?.textContent).toContain("Linux Setup");
    expect(modal?.textContent).toContain("macOS Setup");
  });
});

describe("landing entrypoints", () => {
  it("shows create, upload, read-from-radio, and setup guide entrypoints", () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    expect(container.querySelector("#create-new-md380-btn")).not.toBeNull();
    expect(container.querySelector("#create-new-md390-btn")).not.toBeNull();
    expect(container.querySelector("#open-existing-btn")).not.toBeNull();
    expect(container.querySelector("#landing-read-radio-btn")).not.toBeNull();
    expect(container.querySelector("#open-setup-guide-btn")).not.toBeNull();
    expect(container.querySelector("#landing-radio-progress")).toBeNull();
  });

  it("opens unified setup guide popup from landing", () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    click(container, "#open-setup-guide-btn");

    const modal = container.querySelector("#guide-modal");
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain("WebUSB Setup Guide");
    expect(modal?.textContent).toContain("Windows Setup");
    expect(modal?.textContent).toContain("Linux Setup");
    expect(modal?.textContent).toContain("macOS Setup");
  });

  it("keeps all landing buttons disabled until risk checkbox is selected", () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    const createMd380Button = container.querySelector<HTMLButtonElement>("#create-new-md380-btn");
    const createMd390Button = container.querySelector<HTMLButtonElement>("#create-new-md390-btn");
    const openButton = container.querySelector<HTMLButtonElement>("#open-existing-btn");
    const readButton = container.querySelector<HTMLButtonElement>("#landing-read-radio-btn");
    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");

    expect(createMd380Button?.disabled).toBe(true);
    expect(createMd390Button?.disabled).toBe(true);
    expect(openButton?.disabled).toBe(true);
    expect(readButton?.disabled).toBe(true);

    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    expect(container.querySelector<HTMLButtonElement>("#create-new-md380-btn")?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>("#create-new-md390-btn")?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>("#open-existing-btn")?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>("#landing-read-radio-btn")?.disabled).toBe(false);
  });

  it("creates and loads a blank MD380 codeplug from the landing action", () => {
    document.body.innerHTML = "";
    const { container, store } = mountApp();

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#create-new-md380-btn");

    const snapshot = store.getState();
    expect(snapshot.document?.fileName).toBe("blank-md380.bin");
    expect(snapshot.document?.settings.radioName).toBe("NEW-RADIO");
    expect(snapshot.document?.model).toBe("MD380");
    expect(snapshot.document?.variant).toBe("D");
    expect(snapshot.document?.channels).toHaveLength(0);
    expect(container.querySelector("#export-btn")).not.toBeNull();
  });

  it("creates and loads a blank MD390 codeplug from the landing action", () => {
    document.body.innerHTML = "";
    const { container, store } = mountApp();

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#create-new-md390-btn");

    const snapshot = store.getState();
    expect(snapshot.document?.fileName).toBe("blank-md390.bin");
    expect(snapshot.document?.settings.radioName).toBe("NEW-RADIO");
    expect(snapshot.document?.model).toBe("MD390");
    expect(snapshot.document?.variant).toBe("S");
    expect(snapshot.document?.channels).toHaveLength(0);
    expect(container.querySelector("#export-btn")).not.toBeNull();
  });
});

describe("radio transfer progress", () => {
  it("updates landing progress without replacing progress element during callbacks", async () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    const capturedProgressNodes: Array<HTMLProgressElement | null> = [];
    let connected = false;
    let resolveRead: ((value: Uint8Array) => void) | null = null;
    const readPromise = new Promise<Uint8Array>((resolve) => {
      resolveRead = resolve;
    });

    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async (onProgress) => {
        onProgress?.({ direction: "read", completedBlocks: 1, totalBlocks: 4, bytesTransferred: 1024, totalBytes: 4096 });
        capturedProgressNodes.push(container.querySelector<HTMLProgressElement>("#landing-radio-progress"));

        onProgress?.({ direction: "read", completedBlocks: 2, totalBlocks: 4, bytesTransferred: 2048, totalBytes: 4096 });
        capturedProgressNodes.push(container.querySelector<HTMLProgressElement>("#landing-radio-progress"));

        return await readPromise;
      },
      writeCodeplug: async () => undefined,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#landing-read-radio-btn");
    await flushAsyncWork();

    expect(capturedProgressNodes.length).toBe(2);
    expect(capturedProgressNodes[0]).not.toBeNull();
    expect(capturedProgressNodes[1]).toBe(capturedProgressNodes[0]);

    const progressLabel = container.querySelector<HTMLElement>("#landing-radio-progress-label");
    expect(progressLabel?.textContent).toContain("2/4 blocks");

    resolveRead?.(new Uint8Array(262144));
    await flushAsyncWork();
  });

  it("shows read failure when radio bytes are not a valid codeplug", async () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    const toastSpy = vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    let connected = false;
    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(1234),
      writeCodeplug: async () => undefined,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#landing-read-radio-btn");
    await flushAsyncWork();

    const toastCalls = toastSpy.mock.calls.map((call) => call[0]);
    expect(toastCalls.some((opts) => opts.type === "error" && opts.message.includes("Read failed:"))).toBe(true);
    expect(container.textContent).toContain("Unsupported .bin size");
  });

  it("updates radio-transfer write progress without replacing progress element during callbacks", async () => {
    document.body.innerHTML = "";
    const { container, store } = mountApp();
    store.loadDocument(makeDocument());
    vi.spyOn(store, "exportBytes").mockReturnValue(new Uint8Array(262144));

    vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    const capturedProgressNodes: Array<HTMLProgressElement | null> = [];
    let connected = false;
    let resolveWrite: (() => void) | null = null;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });

    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(262144),
      writeCodeplug: async (_data, onProgress) => {
        onProgress?.({ direction: "write", completedBlocks: 1, totalBlocks: 4, bytesTransferred: 1024, totalBytes: 4096 });
        capturedProgressNodes.push(container.querySelector<HTMLProgressElement>("#radio-transfer-progress"));

        onProgress?.({ direction: "write", completedBlocks: 2, totalBlocks: 4, bytesTransferred: 2048, totalBytes: 4096 });
        capturedProgressNodes.push(container.querySelector<HTMLProgressElement>("#radio-transfer-progress"));

        await writePromise;
      },
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    click(container, '[data-tab="radio-transfer"]');
    click(container, "#radio-transfer-connect");
    await flushAsyncWork();

    click(container, "#radio-transfer-write");
    await flushAsyncWork();

    expect(capturedProgressNodes.length).toBe(2);
    expect(capturedProgressNodes[0]).not.toBeNull();
    expect(capturedProgressNodes[1]).toBe(capturedProgressNodes[0]);

    const progressLabel = container.querySelector<HTMLElement>("#radio-transfer-progress-label");
    expect(progressLabel?.textContent).toContain("2/4 blocks");

    resolveWrite?.();
    await flushAsyncWork();
  });

  it("shows model mismatch warning and cancels write when user declines", async () => {
    document.body.innerHTML = "";
    const { container, store } = mountApp();
    const doc = makeDocument();
    doc.model = "MD390";
    doc.variant = "S";
    store.loadDocument(doc);
    vi.spyOn(store, "exportBytes").mockReturnValue(new Uint8Array(262144));

    vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(dialog, "showConfirm").mockResolvedValue(false);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    let connected = false;
    const writeSpy = vi.fn(async () => undefined);
    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(262144),
      writeCodeplug: writeSpy,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    click(container, '[data-tab="radio-transfer"]');
    click(container, "#radio-transfer-connect");
    await flushAsyncWork();

    click(container, "#radio-transfer-write");
    await flushAsyncWork();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("shows model mismatch warning and proceeds when user confirms", async () => {
    document.body.innerHTML = "";
    const { container, store } = mountApp();
    const doc = makeDocument();
    doc.model = "MD390";
    doc.variant = "S";
    store.loadDocument(doc);
    vi.spyOn(store, "exportBytes").mockReturnValue(new Uint8Array(262144));

    vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(dialog, "showConfirm").mockResolvedValue(true);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    let connected = false;
    const writeSpy = vi.fn(async () => undefined);
    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(262144),
      writeCodeplug: writeSpy,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    click(container, '[data-tab="radio-transfer"]');
    click(container, "#radio-transfer-connect");
    await flushAsyncWork();

    click(container, "#radio-transfer-write");
    await flushAsyncWork();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });
});

describe("callsign updater workflow", () => {
  it("completes build and flash flow with mocked radio write", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    const { container } = mountApp();

    const toastSpy = vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(dialog, "showConfirm").mockResolvedValue(true);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("callsign-meta.json")) {
        return new Response(JSON.stringify({ updatedAt: "2026-06-10T03:00:00Z" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY\n1,IK1AAA,Name,City,State,Nick,Country\n", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      });
    });

    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:vitest-callsign");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    let connected = false;
    const getSpiFlashSizeSpy = vi.fn(async () => 16 * 1024 * 1024);
    const readSpiFlashRegionSpy = vi.fn(
      async (_address: number, size: number, onProgress?: (progress: browserRadio.BrowserTransferProgress) => void) => {
        onProgress?.({ direction: "read", completedBlocks: 1, totalBlocks: 2, bytesTransferred: 1024, totalBytes: size });
        onProgress?.({ direction: "read", completedBlocks: 2, totalBlocks: 2, bytesTransferred: size, totalBytes: size });
        return new Uint8Array(size);
      },
    );
    const writeSpiFlashRegionSpy = vi.fn(
      async (_address: number, data: Uint8Array, onProgress?: (progress: browserRadio.BrowserTransferProgress) => void) => {
        onProgress?.({ direction: "write", completedBlocks: 1, totalBlocks: 2, bytesTransferred: 1024, totalBytes: data.byteLength });
        onProgress?.({ direction: "write", completedBlocks: 2, totalBlocks: 2, bytesTransferred: data.byteLength, totalBytes: data.byteLength });
      },
    );

    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(262144),
      writeCodeplug: async () => undefined,
      getSpiFlashSize: getSpiFlashSizeSpy,
      readSpiFlashRegion: readSpiFlashRegionSpy,
      writeSpiFlashRegion: writeSpiFlashRegionSpy,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#open-callsign-workflow-btn");
    click(container, "#callsign-workflow-build-btn");
    await flushAsyncWork();
    await vi.advanceTimersByTimeAsync(100); // Advance past the 50ms progress yield
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalled();
    // Verify BASE_URL-prefixed paths are used
    expect(fetchSpy.mock.calls.some((call) => String(call[0]) === "https://iu2frl.github.io/md380-codeplug-editor/user.csv")).toBe(true);
    expect(fetchSpy.mock.calls.some((call) => String(call[0]) === "https://iu2frl.github.io/md380-codeplug-editor/callsign-meta.json")).toBe(true);
    expect(container.textContent).toContain("Build complete:");

    const performDbBackup = container.querySelector<HTMLInputElement>("#perform-db-backup");
    if (!performDbBackup) throw new Error("db-backup checkbox not found");
    performDbBackup.checked = true;
    performDbBackup.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#callsign-workflow-flash-btn");
    await flushAsyncWork();
    await flushAsyncWork();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(getSpiFlashSizeSpy).toHaveBeenCalledTimes(1);
    expect(readSpiFlashRegionSpy).toHaveBeenCalledTimes(1);
    expect(writeSpiFlashRegionSpy).toHaveBeenCalledTimes(1);
    expect(writeSpiFlashRegionSpy.mock.calls[0]?.[0]).toBe(0x100000);
    expect(container.textContent).toContain("Flash complete:");
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
    const toastCalls = toastSpy.mock.calls.map((call) => call[0]);
    expect(toastCalls.some((opts) => opts.type === "success" && opts.message.includes("Callsign build complete"))).toBe(true);
    expect(toastCalls.some((opts) => opts.type === "success" && opts.message.includes("Flash complete"))).toBe(true);

    vi.useRealTimers();
  });
});

describe("time sync workflow", () => {
  it("syncs radio date/time using selected timezone", async () => {
    document.body.innerHTML = "";
    const { container } = mountApp();

    const toastSpy = vi.spyOn(dialog, "showToast").mockImplementation(() => undefined);
    vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
      isSecureContext: true,
      hasNavigatorUsb: true,
      hasRequestDevice: true,
      userAgent: "Vitest Chromium",
      supported: true,
      blockers: [],
      warnings: [],
    });

    let connected = false;
    const syncRtcClockSpy = vi.fn(async () => undefined);
    const rebootSpy = vi.fn(async () => undefined);

    const fakeTransport: browserRadio.BrowserRadioTransport = {
      connect: async () => {
        connected = true;
        return { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" };
      },
      disconnect: async () => {
        connected = false;
      },
      isConnected: () => connected,
      getConnectedDevice: () => (connected ? { vendorId: 0x0483, productId: 0xdf11, productName: "MD380" } : null),
      readCodeplug: async () => new Uint8Array(262144),
      writeCodeplug: async () => undefined,
      getSpiFlashSize: async () => 16 * 1024 * 1024,
      readSpiFlashRegion: async () => new Uint8Array(0),
      writeSpiFlashRegion: async () => undefined,
      syncRtcClock: syncRtcClockSpy,
      rebootRadio: rebootSpy,
    };

    vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(fakeTransport);

    const riskAck = container.querySelector<HTMLInputElement>("#risk-ack");
    if (!riskAck) throw new Error("risk checkbox not found");
    riskAck.checked = true;
    riskAck.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#open-time-sync-workflow-btn");
    const zoneSelect = container.querySelector<HTMLSelectElement>("#time-sync-workflow-timezone");
    if (!zoneSelect) throw new Error("time sync timezone selector not found");
    zoneSelect.value = "UTC+2:00";
    zoneSelect.dispatchEvent(new Event("change", { bubbles: true }));

    click(container, "#time-sync-workflow-apply-btn");
    await flushAsyncWork();
    await flushAsyncWork();

    expect(syncRtcClockSpy).toHaveBeenCalledTimes(1);
    expect(rebootSpy).toHaveBeenCalledTimes(1);
    const firstPayload = syncRtcClockSpy.mock.calls[0]?.[0] as browserRadio.BrowserRtcSyncPayload;
    expect(firstPayload.year).toBeGreaterThanOrEqual(2000);
    expect(firstPayload.month).toBeGreaterThanOrEqual(1);
    expect(firstPayload.month).toBeLessThanOrEqual(12);
    expect(container.textContent).toContain("Sync complete:");
    expect(toastSpy.mock.calls.some((call) => call[0].type === "success")).toBe(true);
  });
});

