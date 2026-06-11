/**
 * Firmware workflow UI tests.
 *
 * Transport is mocked so no real USB calls are made.
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "../state/store";
import * as dialog from "./dialog";
import * as browserRadio from "../transport/browserRadio";
import * as uiHelpers from "./uiHelpers";
import { renderFirmwareWorkflow, bindFirmwareWorkflowActions } from "./firmwareWorkflow";
import { createInitialChannelPanelState, createInitialUiState } from "./uiTypes";

// ---------------------------------------------------------------------------
// Mock Transport
// ---------------------------------------------------------------------------

function createMockTransport(options: {
  readResult?: Uint8Array;
  readError?: Error;
  isConnected?: boolean;
} = {}): browserRadio.BrowserRadioTransport {
  const {
    readResult = new Uint8Array(browserRadio.FIRMWARE_TOTAL_SIZE),
    readError,
    isConnected = false,
  } = options;

  return {
    connect: vi.fn().mockResolvedValue({
      vendorId: 0x0483,
      productId: 0xdf11,
      productName: "Test Radio",
      manufacturerName: "AnyRoad Technology",
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(isConnected),
    getConnectedDevice: vi.fn().mockReturnValue(null),
    readCodeplug: vi.fn().mockResolvedValue(new Uint8Array(262144)),
    writeCodeplug: vi.fn().mockResolvedValue(undefined),
    getSpiFlashSize: vi.fn().mockResolvedValue(16 * 1024 * 1024),
    readSpiFlashRegion: vi.fn().mockResolvedValue(new Uint8Array(1024)),
    writeSpiFlashRegion: vi.fn().mockResolvedValue(undefined),
    rebootRadio: vi.fn().mockResolvedValue(undefined),
    readFirmware: readError
      ? vi.fn().mockRejectedValue(readError)
      : vi.fn().mockImplementation(async (onProgress) => {
          const totalBlocks = browserRadio.FIRMWARE_TOTAL_SIZE / 1024;
          for (let i = 1; i <= totalBlocks; i++) {
            onProgress?.({
              direction: "read",
              completedBlocks: i,
              totalBlocks,
              bytesTransferred: i * 1024,
              totalBytes: browserRadio.FIRMWARE_TOTAL_SIZE,
            });
          }
          return readResult;
        }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountWorkflow(options: {
  riskAccepted?: boolean;
  mockTransport?: browserRadio.BrowserRadioTransport | null;
  webUsbSupported?: boolean;
} = {}): {
  container: HTMLElement;
  store: EditorStore;
  uiState: ReturnType<typeof createInitialUiState>;
  channelState: ReturnType<typeof createInitialChannelPanelState>;
  renderState: ReturnType<typeof vi.fn>;
} {
  const {
    riskAccepted = true,
    mockTransport = createMockTransport(),
    webUsbSupported = true,
  } = options;

  const container = document.createElement("div");
  document.body.appendChild(container);

  const store = new EditorStore();
  const uiState = createInitialUiState();
  uiState.riskAccepted = riskAccepted;
  uiState.landingView = "firmware-workflow";

  // Mock WebUSB capabilities
  vi.spyOn(browserRadio, "detectBrowserRadioCapabilities").mockReturnValue({
    isSecureContext: true,
    hasNavigatorUsb: webUsbSupported,
    hasRequestDevice: webUsbSupported,
    userAgent: "TestBrowser",
    supported: webUsbSupported,
    blockers: webUsbSupported ? [] : ["WebUSB API is unavailable in this browser."],
    warnings: [],
  });

  vi.spyOn(browserRadio, "createBrowserRadioTransport").mockReturnValue(mockTransport);

  // Mock downloadBytes since it won't work in test environment
  vi.spyOn(uiHelpers, "downloadBytes").mockImplementation(() => {});

  const channelState = createInitialChannelPanelState();
  const renderState = vi.fn((target: HTMLElement) => {
    target.innerHTML = renderFirmwareWorkflow(uiState);
    bindFirmwareWorkflowActions(target, store, store.getState(), channelState, uiState, renderState);
  });

  container.innerHTML = renderFirmwareWorkflow(uiState);
  bindFirmwareWorkflowActions(container, store, store.getState(), channelState, uiState, renderState);

  return { container, store, uiState, channelState, renderState };
}

async function flushAsync(): Promise<void> {
  await vi.runAllTimersAsync();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Tests: Rendering
// ---------------------------------------------------------------------------

describe("firmwareWorkflow rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders the workflow page with title and backup button", () => {
    const { container } = mountWorkflow();

    expect(container.querySelector("h1")?.textContent).toContain("Firmware Backup");
    expect(container.querySelector("#firmware-backup-btn")).not.toBeNull();
    expect(container.querySelector("#firmware-back-home-btn")).not.toBeNull();
  });

  it("disables backup button when risk is not accepted", () => {
    const { container } = mountWorkflow({ riskAccepted: false });

    const btn = container.querySelector<HTMLButtonElement>("#firmware-backup-btn");
    expect(btn?.disabled).toBe(true);
  });

  it("enables backup button when risk is accepted", () => {
    const { container } = mountWorkflow({ riskAccepted: true });

    const btn = container.querySelector<HTMLButtonElement>("#firmware-backup-btn");
    expect(btn?.disabled).toBe(false);
  });

  it("renders bootloader mode instructions", () => {
    const { container } = mountWorkflow();

    expect(container.textContent).toContain("Bootloader Mode Required");
    expect(container.textContent).toContain("PTT");
    expect(container.textContent).toContain("green and red");
  });
});

// ---------------------------------------------------------------------------
// Tests: Navigation
// ---------------------------------------------------------------------------

describe("firmwareWorkflow navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("back button sets landingView to home", () => {
    const { container, uiState, renderState } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#firmware-back-home-btn")!.click();

    expect(uiState.landingView).toBe("home");
    expect(renderState).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Backup flow
// ---------------------------------------------------------------------------

describe("firmwareWorkflow backup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(dialog, "showToast").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("shows error toast when WebUSB is not supported", async () => {
    const { container } = mountWorkflow({ webUsbSupported: false });

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("shows error toast when transport is null", async () => {
    const { container } = mountWorkflow({ mockTransport: null });

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("sets firmwareBusy back to false after backup completes", async () => {
    const { container, uiState } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(uiState.firmwareBusy).toBe(false);
  });

  it("shows success toast after successful backup", async () => {
    const { container } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("shows error toast when backup fails", async () => {
    const { container } = mountWorkflow({
      mockTransport: createMockTransport({ readError: new Error("USB transfer failed") }),
    });

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("updates status message after successful backup", async () => {
    const { container, uiState } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(uiState.firmwareStatusMessage).toContain("Backup complete");
  });

  it("updates status message after failed backup", async () => {
    const { container, uiState } = mountWorkflow({
      mockTransport: createMockTransport({ readError: new Error("Device not in bootloader mode") }),
    });

    container.querySelector<HTMLButtonElement>("#firmware-backup-btn")!.click();
    await flushAsync();

    expect(uiState.firmwareStatusMessage).toContain("Backup failed");
    expect(uiState.firmwareStatusMessage).toContain("bootloader mode");
  });
});
