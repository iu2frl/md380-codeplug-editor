import type { AppState, EditorStore } from "../state/store";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  FIRMWARE_TOTAL_SIZE,
  type BrowserTransferProgress,
} from "../transport/browserRadio";
import type { ChannelPanelState, UiState } from "./uiTypes";
import { escapeHtml, downloadBytes, utcStamp } from "./uiHelpers";
import { showToast } from "./dialog";
import { renderLanguageSelector } from "./languageSelector";

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

export function renderFirmwareWorkflow(uiState: UiState): string {
  const canBackup = uiState.riskAccepted && !uiState.firmwareBusy;

  return `
    <main class="layout">
      <section class="hero card">
        ${renderLanguageSelector(uiState)}
        <h1>Firmware Backup</h1>
        <p>Create a backup of your radio's firmware. This is a read-only operation and does not modify the radio.</p>
        <div class="actions">
          <button id="firmware-back-home-btn" class="button ghost">Back To Homepage</button>
        </div>
      </section>

      <section class="card risk-card">
        <h2>Important: Bootloader Mode Required</h2>
        <p class="risk-text">
          Firmware backup requires the radio to be in <strong>STM32 bootloader mode</strong>, not normal programming mode.<br><br>
          To enter bootloader mode:
        </p>
        <ol class="radio-transfer-list">
          <li>Turn off your radio completely.</li>
          <li>Hold <strong>PTT</strong> and the <strong>button above PTT</strong> (top side button) simultaneously.</li>
          <li>While holding both buttons, turn on the radio using the volume knob.</li>
          <li>The LED should blink <strong>green and red alternately</strong> — this indicates bootloader mode.</li>
          <li>Connect the USB cable to your computer.</li>
          <li>Click the backup button below.</li>
        </ol>
        <p class="risk-text">
          If the radio boots normally (shows the boot screen), turn it off and try again. Both buttons must be held before and during power-on.
        </p>
      </section>

      <section class="card">
        <h2>Backup Firmware</h2>
        <p class="muted-text">Read ${Math.round(FIRMWARE_TOTAL_SIZE / 1024)} KB of firmware from internal flash (0x0800c000 – 0x080e0000). This takes about 15–30 seconds.</p>
        <button id="firmware-backup-btn" class="button callsign-action-btn" ${canBackup ? "" : "disabled"}>Backup Firmware</button>
      </section>

      <section class="card">
        <h2>Operation Status</h2>
        <p class="muted-text" id="firmware-status">Status: ${escapeHtml(uiState.firmwareStatusMessage)}</p>
        <div id="firmware-progress-wrap" class="radio-transfer-progress ${uiState.firmwareProgressVisible ? "" : "hidden"}">
          <progress id="firmware-progress" max="100" value="${uiState.firmwareProgressPercent}"></progress>
          <p class="muted-text" id="firmware-progress-label">${escapeHtml(uiState.firmwareProgressLabel)}</p>
        </div>
      </section>
    </main>
  `;
}

export function bindFirmwareWorkflowActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  target.querySelector<HTMLButtonElement>("#firmware-back-home-btn")?.addEventListener("click", () => {
    uiState.landingView = "home";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#firmware-backup-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.firmwareBusy) {
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
    if (typeof transport.readFirmware !== "function") {
      showToast({ type: "error", message: "Firmware backup is not supported by this transport." });
      return;
    }

    uiState.radioTransport = transport;
    uiState.firmwareBusy = true;
    uiState.firmwareProgressPercent = 0;
    uiState.firmwareProgressVisible = true;
    uiState.firmwareProgressLabel = "Connecting to radio in bootloader mode…";
    uiState.firmwareStatusMessage = "Connecting to radio…";
    renderState(target, store, store.getState(), channelState, uiState);

    const applyProgress = (progress: BrowserTransferProgress): void => {
      const percent = Math.round((progress.completedBlocks / progress.totalBlocks) * 100);
      uiState.firmwareProgressPercent = percent;
      uiState.firmwareProgressLabel = `Reading block ${progress.completedBlocks} / ${progress.totalBlocks} (${Math.round(progress.bytesTransferred / 1024)} KB)…`;
      const bar = target.querySelector<HTMLProgressElement>("#firmware-progress");
      const label = target.querySelector<HTMLElement>("#firmware-progress-label");
      const status = target.querySelector<HTMLElement>("#firmware-status");
      if (bar) bar.value = percent;
      if (label) label.textContent = uiState.firmwareProgressLabel;
      if (status) status.textContent = `Status: Reading firmware…`;
    };

    let connected = false;
    try {
      if (!transport.isConnected()) {
        await transport.connect();
      }
      connected = true;

      uiState.firmwareStatusMessage = "Reading firmware, please wait…";
      uiState.firmwareProgressLabel = "Starting firmware read…";
      renderState(target, store, store.getState(), channelState, uiState);

      const firmware = await transport.readFirmware(applyProgress);
      const stamp = utcStamp();
      const filename = `firmware-backup-${stamp}.bin`;
      downloadBytes(filename, firmware);

      uiState.firmwareStatusMessage = `Backup complete: ${firmware.byteLength} bytes saved as ${filename}.`;
      uiState.firmwareProgressPercent = 100;
      uiState.firmwareProgressLabel = "Backup complete.";
      showToast({ type: "success", message: `Firmware backup complete: ${Math.round(firmware.byteLength / 1024)} KB saved.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup failed.";
      uiState.firmwareStatusMessage = `Backup failed: ${message}`;
      uiState.firmwareProgressVisible = false;
      showToast({ type: "error", message: `Backup failed: ${message}` });
    } finally {
      if (connected) {
        try {
          await transport.disconnect();
        } catch {
          // Ignore disconnect cleanup errors.
        }
      }
      uiState.radioTransport = null;
      uiState.firmwareBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  void state;
}
