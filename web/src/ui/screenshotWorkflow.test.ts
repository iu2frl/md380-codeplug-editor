/**
 * Screenshot workflow UI tests.
 *
 * Transport is mocked so no real USB calls are made.
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "../state/store";
import * as dialog from "./dialog";
import * as browserRadio from "../transport/browserRadio";
import { renderScreenshotWorkflow, bindScreenshotWorkflowActions } from "./screenshotWorkflow";
import { createInitialChannelPanelState, createInitialUiState } from "./uiTypes";

// ---------------------------------------------------------------------------
// Mock Transport
// ---------------------------------------------------------------------------

function createMockTransport(options: {
  captureResult?: Uint8Array;
  captureError?: Error;
  isConnected?: boolean;
} = {}): browserRadio.BrowserRadioTransport {
  const {
    captureResult = new Uint8Array(browserRadio.SCREENSHOT_WIDTH * browserRadio.SCREENSHOT_HEIGHT * 3),
    captureError,
    isConnected = false,
  } = options;

  return {
    connect: vi.fn().mockResolvedValue({
      vendorId: 0x0483,
      productId: 0xdf11,
      productName: "Test Radio",
      manufacturerName: "Test",
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
    captureScreenshot: captureError
      ? vi.fn().mockRejectedValue(captureError)
      : vi.fn().mockImplementation(async (onProgress) => {
          for (let i = 1; i <= browserRadio.SCREENSHOT_HEIGHT; i++) {
            onProgress?.(i, browserRadio.SCREENSHOT_HEIGHT);
          }
          return captureResult;
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
  uiState.landingView = "screenshot-workflow";

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

  const channelState = createInitialChannelPanelState();
  const renderState = vi.fn((target: HTMLElement) => {
    target.innerHTML = renderScreenshotWorkflow(uiState);
    bindScreenshotWorkflowActions(target, store, store.getState(), channelState, uiState, renderState);
  });

  container.innerHTML = renderScreenshotWorkflow(uiState);
  bindScreenshotWorkflowActions(container, store, store.getState(), channelState, uiState, renderState);

  return { container, store, uiState, channelState, renderState };
}

async function flushAsync(): Promise<void> {
  await vi.runAllTimersAsync();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Tests: Rendering
// ---------------------------------------------------------------------------

describe("screenshotWorkflow rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders the workflow page with title and capture button", () => {
    const { container } = mountWorkflow();

    expect(container.querySelector("h1")?.textContent).toContain("Radio Screenshot");
    expect(container.querySelector("#screenshot-capture-btn")).not.toBeNull();
    expect(container.querySelector("#screenshot-back-home-btn")).not.toBeNull();
  });

  it("disables capture button when risk is not accepted", () => {
    const { container } = mountWorkflow({ riskAccepted: false });

    const btn = container.querySelector<HTMLButtonElement>("#screenshot-capture-btn");
    expect(btn?.disabled).toBe(true);
  });

  it("enables capture button when risk is accepted", () => {
    const { container } = mountWorkflow({ riskAccepted: true });

    const btn = container.querySelector<HTMLButtonElement>("#screenshot-capture-btn");
    expect(btn?.disabled).toBe(false);
  });

  it("does not render preview section when no image data is present", () => {
    const { container } = mountWorkflow();

    expect(container.querySelector("#screenshot-canvas")).toBeNull();
    expect(container.querySelector("#screenshot-save-btn")).toBeNull();
    expect(container.querySelector("#screenshot-clear-btn")).toBeNull();
  });

  it("renders preview section with canvas when image data is present", () => {
    const { container, uiState, renderState } = mountWorkflow();

    // Simulate captured image data
    uiState.screenshotImageData = new Uint8Array(browserRadio.SCREENSHOT_WIDTH * browserRadio.SCREENSHOT_HEIGHT * 3);
    renderState(container);

    expect(container.querySelector("#screenshot-canvas")).not.toBeNull();
    expect(container.querySelector("#screenshot-save-btn")).not.toBeNull();
    expect(container.querySelector("#screenshot-clear-btn")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Navigation
// ---------------------------------------------------------------------------

describe("screenshotWorkflow navigation", () => {
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

    container.querySelector<HTMLButtonElement>("#screenshot-back-home-btn")!.click();

    expect(uiState.landingView).toBe("home");
    expect(renderState).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Capture flow
// ---------------------------------------------------------------------------

describe("screenshotWorkflow capture", () => {
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

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("shows error toast when transport is null", async () => {
    const { container } = mountWorkflow({ mockTransport: null });

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("sets screenshotImageData after successful capture", async () => {
    const fakePixels = new Uint8Array(browserRadio.SCREENSHOT_WIDTH * browserRadio.SCREENSHOT_HEIGHT * 3);
    fakePixels[0] = 255; // Mark first pixel red

    const { container, uiState } = mountWorkflow({
      mockTransport: createMockTransport({ captureResult: fakePixels }),
    });

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(uiState.screenshotImageData).not.toBeNull();
    expect(uiState.screenshotImageData![0]).toBe(255);
  });

  it("sets screenshotBusy back to false after capture completes", async () => {
    const { container, uiState } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(uiState.screenshotBusy).toBe(false);
  });

  it("shows success toast after successful capture", async () => {
    const { container } = mountWorkflow();

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("shows error toast when capture fails", async () => {
    const { container } = mountWorkflow({
      mockTransport: createMockTransport({ captureError: new Error("USB transfer failed") }),
    });

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("does not set screenshotImageData when capture fails", async () => {
    const { container, uiState } = mountWorkflow({
      mockTransport: createMockTransport({ captureError: new Error("USB transfer failed") }),
    });

    container.querySelector<HTMLButtonElement>("#screenshot-capture-btn")!.click();
    await flushAsync();

    expect(uiState.screenshotImageData).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Clear button
// ---------------------------------------------------------------------------

describe("screenshotWorkflow clear", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("clears screenshotImageData when clear button is clicked", () => {
    const { container, uiState, renderState } = mountWorkflow();

    // Simulate having captured data
    uiState.screenshotImageData = new Uint8Array(browserRadio.SCREENSHOT_WIDTH * browserRadio.SCREENSHOT_HEIGHT * 3);
    renderState(container);

    container.querySelector<HTMLButtonElement>("#screenshot-clear-btn")!.click();

    expect(uiState.screenshotImageData).toBeNull();
    expect(uiState.screenshotStatusMessage).toBe("No screenshot captured yet.");
  });
});
