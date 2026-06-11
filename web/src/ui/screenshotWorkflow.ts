import type { AppState, EditorStore } from "../state/store";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  SCREENSHOT_WIDTH,
  SCREENSHOT_HEIGHT,
} from "../transport/browserRadio";
import type { ChannelPanelState, UiState } from "./uiTypes";
import { escapeHtml } from "./uiHelpers";
import { showToast } from "./dialog";

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

export function renderScreenshotWorkflow(uiState: UiState): string {
  const canCapture = uiState.riskAccepted && !uiState.screenshotBusy;
  const progressPercent = Math.round((uiState.screenshotProgressLine / SCREENSHOT_HEIGHT) * 100);

  return `
    <main class="layout">
      <section class="hero card">
        <h1>Radio Screenshot</h1>
        <p>Capture the current LCD display of your radio as a PNG image. Requires patched firmware.</p>
        <div class="actions">
          <button id="screenshot-back-home-btn" class="button ghost">Back To Homepage</button>
        </div>
      </section>

      <section class="card">
        <h2>1. Capture</h2>
        <p class="muted-text">Connect your radio in programming mode, then capture the current display (160×128 pixels, ~5 seconds).</p>
        <button id="screenshot-capture-btn" class="button callsign-action-btn" ${canCapture ? "" : "disabled"}>Capture Screenshot</button>
      </section>

      ${uiState.screenshotImageData ? `
      <section class="card">
        <h2>2. Preview &amp; Save</h2>
        <p class="muted-text">Screenshot captured successfully. Click <strong>Save PNG</strong> to download.</p>
        <canvas id="screenshot-canvas" width="${SCREENSHOT_WIDTH}" height="${SCREENSHOT_HEIGHT}" style="display:block;border:1px solid var(--line);border-radius:6px;image-rendering:pixelated;width:${SCREENSHOT_WIDTH * 3}px;height:${SCREENSHOT_HEIGHT * 3}px;"></canvas>
        <div class="actions" style="margin-top:0.75rem;">
          <button id="screenshot-save-btn" class="button">Save PNG</button>
          <button id="screenshot-clear-btn" class="button ghost">Clear</button>
        </div>
      </section>
      ` : ""}

      <section class="card">
        <h2>Operation Status</h2>
        <p class="muted-text" id="screenshot-status">Status: ${escapeHtml(uiState.screenshotStatusMessage)}</p>
        <div id="screenshot-progress-wrap" class="radio-transfer-progress ${uiState.screenshotProgressVisible ? "" : "hidden"}">
          <progress id="screenshot-progress" max="100" value="${progressPercent}"></progress>
          <p class="muted-text" id="screenshot-progress-label">Reading line ${uiState.screenshotProgressLine} / ${SCREENSHOT_HEIGHT}…</p>
        </div>
      </section>
    </main>
  `;
}

export function bindScreenshotWorkflowActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  target.querySelector<HTMLButtonElement>("#screenshot-back-home-btn")?.addEventListener("click", () => {
    uiState.landingView = "home";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#screenshot-capture-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.screenshotBusy) {
      return;
    }

    const capabilities = detectBrowserRadioCapabilities();
    if (!capabilities.supported) {
      showToast({ type: "error", message: `WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}` });
      return;
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      showToast({ type: "error", message: "Unable to initialize WebUSB transport in this browser." });
      return;
    }
    if (typeof transport.captureScreenshot !== "function") {
      showToast({ type: "error", message: "Screenshot capture requires patched firmware on the radio." });
      return;
    }

    uiState.radioTransport = transport;
    uiState.screenshotBusy = true;
    uiState.screenshotProgressLine = 0;
    uiState.screenshotProgressVisible = true;
    uiState.screenshotStatusMessage = "Connecting to radio…";
    uiState.screenshotImageData = null;
    renderState(target, store, store.getState(), channelState, uiState);

    let connected = false;
    try {
      if (!transport.isConnected()) {
        await transport.connect();
      }
      connected = true;
      uiState.screenshotStatusMessage = "Capturing display, please wait…";
      renderState(target, store, store.getState(), channelState, uiState);

      const pixels = await transport.captureScreenshot((line, total) => {
        uiState.screenshotProgressLine = line;
        const wrap = target.querySelector<HTMLElement>("#screenshot-progress-wrap");
        const bar = target.querySelector<HTMLProgressElement>("#screenshot-progress");
        const label = target.querySelector<HTMLElement>("#screenshot-progress-label");
        const status = target.querySelector<HTMLElement>("#screenshot-status");
        if (bar) bar.value = Math.round((line / total) * 100);
        if (label) label.textContent = `Reading line ${line} / ${total}…`;
        if (status) status.textContent = `Status: Capturing display, please wait…`;
        if (wrap) wrap.classList.remove("hidden");
      });

      uiState.screenshotImageData = pixels;
      uiState.screenshotStatusMessage = `Capture complete: ${SCREENSHOT_WIDTH}×${SCREENSHOT_HEIGHT} pixels.`;
      uiState.screenshotProgressVisible = false;
      showToast({ type: "success", message: "Screenshot captured successfully." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Capture failed.";
      uiState.screenshotStatusMessage = `Capture failed: ${message}`;
      uiState.screenshotProgressVisible = false;
      showToast({ type: "error", message: `Capture failed: ${message}` });
    } finally {
      if (connected) {
        try {
          await transport.disconnect();
        } catch {
          // Ignore disconnect cleanup errors.
        }
      }
      uiState.radioTransport = null;
      uiState.screenshotBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  // Paint image data onto canvas after render (canvas is freshly created in DOM).
  paintScreenshotCanvas(target, uiState);

  target.querySelector<HTMLButtonElement>("#screenshot-save-btn")?.addEventListener("click", () => {
    const canvas = target.querySelector<HTMLCanvasElement>("#screenshot-canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `radio-screenshot-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  target.querySelector<HTMLButtonElement>("#screenshot-clear-btn")?.addEventListener("click", () => {
    uiState.screenshotImageData = null;
    uiState.screenshotStatusMessage = "No screenshot captured yet.";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  void state;
}

function paintScreenshotCanvas(target: HTMLElement, uiState: UiState): void {
  const canvas = target.querySelector<HTMLCanvasElement>("#screenshot-canvas");
  if (!canvas || !uiState.screenshotImageData) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const imageData = ctx.createImageData(SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT);
  const src = uiState.screenshotImageData;
  for (let i = 0; i < SCREENSHOT_WIDTH * SCREENSHOT_HEIGHT; i += 1) {
    imageData.data[i * 4]     = src[i * 3];     // R
    imageData.data[i * 4 + 1] = src[i * 3 + 1]; // G
    imageData.data[i * 4 + 2] = src[i * 3 + 2]; // B
    imageData.data[i * 4 + 3] = 255;             // A
  }
  ctx.putImageData(imageData, 0, 0);
}
