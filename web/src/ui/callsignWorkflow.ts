import type { AppState, EditorStore } from "../state/store";
import { buildCallsignDatabase } from "../domain/callsign";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  type BrowserTransferProgress,
  type BrowserRadioTransport,
} from "../transport/browserRadio";
import type { ChannelPanelState, UiState } from "./uiTypes";
import {
  escapeHtml,
  downloadBytes,
  setCallsignProgress,
  syncRadioProgressUi,
  utcStamp,
} from "./uiHelpers";
import { showToast, showConfirm } from "./dialog";

const CALLSIGN_FLASH_ADDRESS = 0x100000;
const CALLSIGN_RECOMMENDED_MIN_FLASH = 16 * 1024 * 1024;

function formatCallsignDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return isoDate;
  }
}

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

export function renderCallsignWorkflow(uiState: UiState): string {
  const canBuild = uiState.riskAccepted && !uiState.callsignBusy;
  const canFlash = uiState.riskAccepted && !uiState.callsignBusy && uiState.callsignPayload;

  return `
    <main class="layout">
      <section class="hero card">
        <h1>Callsign Database Workflow</h1>
        <p>This flow is separate from codeplug editing and follows a strict sequence: configure, build, then flash.</p>
        <div class="actions">
          <button id="callsign-back-home-btn" class="button ghost">Back To Homepage</button>
        </div>
      </section>

      <section class="card">
        <h2>1. Select Options</h2>
        ${uiState.callsignLastUpdated ? `<p class="muted-text">Bundled database last updated: <strong>${escapeHtml(formatCallsignDate(uiState.callsignLastUpdated))}</strong>. Database is automatically updated once a week.</p>` : ""}
        <div class="grid">
          <label>
            Database Format
            <select id="callsign-workflow-format" ${canBuild ? "" : "disabled"}>
              <option value="linear" ${uiState.callsignFormat === "linear" ? "selected" : ""}>Linear</option>
              <option value="indexed" ${uiState.callsignFormat === "indexed" ? "selected" : ""}>Indexed (preferred)</option>
            </select>
          </label>
          <label>
            Privacy Profile
            <select id="callsign-workflow-profile" ${canBuild ? "" : "disabled"}>
              <option value="global" ${uiState.callsignProfile === "global" ? "selected" : ""}>Global</option>
              <option value="eu" ${uiState.callsignProfile === "eu" ? "selected" : ""}>EU (privacy-aware)</option>
            </select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2>2. Download And Build</h2>
        <p class="muted-text">Download source CSV, normalize it, then build the selected callsign DB format.</p>
        <button id="callsign-workflow-build-btn" class="button callsign-action-btn" ${canBuild ? "" : "disabled"}>Download + Build DB</button>
        ${
          uiState.callsignPayload
            ? `<p class="muted-text">Ready payload: ${escapeHtml(uiState.callsignPayloadName)} (${uiState.callsignPayload.byteLength} bytes).</p>`
            : ""
        }
      </section>

      <section class="card">
        <h2>3. Write To Transceiver</h2>
        <p class="muted-text">Enabled only after a successful build. A rollback backup is always downloaded before flash.</p>
        <button id="callsign-workflow-flash-btn" class="button callsign-action-btn" ${canFlash ? "" : "disabled"}>Write Callsign DB To Radio</button>
      </section>

      <section class="card">
        <h2>Operation Status</h2>
        <p class="muted-text" id="callsign-status">Status: ${escapeHtml(uiState.callsignStatusMessage)}</p>
        <div id="callsign-progress-wrap" class="radio-transfer-progress ${uiState.callsignProgressVisible ? "" : "hidden"}">
          <progress id="callsign-progress" max="100" value="${uiState.callsignProgressPercent}"></progress>
          <p class="muted-text" id="callsign-progress-label">${escapeHtml(uiState.callsignProgressLabel)}</p>
        </div>
      </section>
    </main>
  `;
}

export function bindCallsignWorkflowActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  target.querySelector<HTMLButtonElement>("#callsign-back-home-btn")?.addEventListener("click", () => {
    uiState.landingView = "home";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  // Fetch callsign metadata on load if not already fetched
  if (!uiState.callsignLastUpdated) {
    fetch(`${import.meta.env.BASE_URL}callsign-meta.json`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (meta?.updatedAt) {
          uiState.callsignLastUpdated = meta.updatedAt;
          renderState(target, store, store.getState(), channelState, uiState);
        }
      })
      .catch(() => {});
  }

  target.querySelector<HTMLSelectElement>("#callsign-workflow-format")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    uiState.callsignFormat = value === "linear" ? "linear" : "indexed";
  });

  target.querySelector<HTMLSelectElement>("#callsign-workflow-profile")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    uiState.callsignProfile = value === "eu" ? "eu" : "global";
  });

  const ensureCallsignTransport = async (): Promise<BrowserRadioTransport> => {
    const capabilities = detectBrowserRadioCapabilities();
    if (!capabilities.supported) {
      throw new Error(`WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}`);
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      throw new Error("Unable to initialize WebUSB transport in this browser.");
    }

    uiState.radioTransport = transport;
    if (!transport.isConnected()) {
      const device = await transport.connect();
      const label = [device.manufacturerName, device.productName].filter((item) => Boolean(item)).join(" ").trim();
      uiState.callsignStatusMessage = `Connected: ${label || "USB radio"}.`;
    }

    return transport;
  };

  target.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.callsignBusy) {
      return;
    }

    const source = `${import.meta.env.BASE_URL}user.csv`;

    uiState.callsignBusy = true;
    uiState.callsignProgressVisible = true;
    uiState.callsignProgressPercent = 0;
    uiState.callsignProgressLabel = "Downloading callsign CSV...";
    uiState.callsignStatusMessage = "Downloading callsign CSV...";
    renderState(target, store, store.getState(), channelState, uiState);

    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}.`);
      }
      const rawCsv = await response.text();

      uiState.callsignProgressPercent = 30;
      uiState.callsignProgressLabel = "Building database...";
      uiState.callsignStatusMessage = "Building callsign database...";
      renderState(target, store, store.getState(), channelState, uiState);

      // Yield to browser so progress UI updates before heavy computation
      await new Promise((resolve) => setTimeout(resolve, 50));

      const built = buildCallsignDatabase(rawCsv, uiState.callsignFormat, uiState.callsignProfile);
      const stamp = utcStamp();
      uiState.callsignPayload = built.payload;
      uiState.callsignPayloadName = `callsign-${uiState.callsignFormat}-${stamp}.bin`;
      uiState.callsignProgressPercent = 100;
      uiState.callsignProgressLabel = "Build complete.";
      uiState.callsignStatusMessage = `Build complete: ${built.payload.byteLength} bytes (${uiState.callsignFormat}, ${uiState.callsignProfile}).`;
      showToast({ type: "success", message: `Callsign build complete: ${built.payload.byteLength} bytes ready to flash.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Callsign build failed.";
      uiState.callsignStatusMessage = `Build failed: ${message}`;
      uiState.callsignProgressVisible = false;
      showToast({ type: "error", message: `Build failed: ${message}` });
    } finally {
      uiState.callsignBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  target.querySelector<HTMLButtonElement>("#callsign-workflow-flash-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.callsignBusy) {
      return;
    }
    if (!uiState.callsignPayload) {
      showToast({ type: "warning", message: "Build the callsign database first." });
      return;
    }

    const confirmed = await showConfirm({
      title: "Flash Callsign Database",
      message: `Flash ${uiState.callsignPayload.byteLength} bytes to 0x${CALLSIGN_FLASH_ADDRESS.toString(16)}?\n\nA rollback backup will be downloaded before write.`,
      confirmLabel: "Flash",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    uiState.callsignBusy = true;
    uiState.callsignProgressVisible = true;
    uiState.callsignProgressPercent = 0;
    uiState.callsignProgressLabel = "Preparing flash...";
    uiState.callsignStatusMessage = "Preparing SPI callsign flash...";
    renderState(target, store, store.getState(), channelState, uiState);

    const applyProgress = (progress: BrowserTransferProgress): void => {
      setCallsignProgress(uiState, progress);
      syncRadioProgressUi(target, uiState);
    };

    try {
      const transport = await ensureCallsignTransport();
      const flashSize = await transport.getSpiFlashSize();
      if (flashSize < CALLSIGN_RECOMMENDED_MIN_FLASH) {
        throw new Error(`Unsupported flash size ${flashSize} bytes; expected at least ${CALLSIGN_RECOMMENDED_MIN_FLASH}.`);
      }
      if (CALLSIGN_FLASH_ADDRESS + uiState.callsignPayload.byteLength > flashSize) {
        throw new Error(`Payload exceeds flash bounds (${flashSize} bytes total).`);
      }

      uiState.callsignProgressVisible = true;
      uiState.callsignProgressPercent = 0;
      uiState.callsignProgressLabel = "Reading rollback backup...";
      renderState(target, store, store.getState(), channelState, uiState);
      const backup = await transport.readSpiFlashRegion(CALLSIGN_FLASH_ADDRESS, uiState.callsignPayload.byteLength, applyProgress);
      const rollbackName = `callsign-backup-${utcStamp()}.bin`;
      downloadBytes(rollbackName, backup);

      uiState.callsignProgressVisible = true;
      uiState.callsignProgressPercent = 0;
      uiState.callsignProgressLabel = "Flashing callsign database...";
      renderState(target, store, store.getState(), channelState, uiState);
      await transport.writeSpiFlashRegion(CALLSIGN_FLASH_ADDRESS, uiState.callsignPayload, applyProgress);
      uiState.callsignStatusMessage = `Flash complete: ${uiState.callsignPayload.byteLength} bytes written at 0x${CALLSIGN_FLASH_ADDRESS.toString(16)}.`;
      uiState.callsignProgressPercent = 100;
      uiState.callsignProgressLabel = "Flash complete.";
      showToast({ type: "success", message: `Flash complete. Rollback backup downloaded as ${rollbackName}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Flash failed.";
      uiState.callsignStatusMessage = `Flash failed: ${message}`;
      uiState.callsignProgressVisible = false;
      showToast({ type: "error", message: `Flash failed: ${message}` });
    } finally {
      uiState.callsignBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  void state;
}
