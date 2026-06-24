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
import { t } from "../i18n";

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
        <h1>${t("firmware.title")}</h1>
        <p>${t("firmware.intro")}</p>
        <div class="actions">
          <button id="firmware-back-home-btn" class="button ghost">${t("common.backHome")}</button>
        </div>
      </section>

      <section class="card risk-card">
        <h2>${t("firmware.bootloader.heading")}</h2>
        <p class="risk-text">
          ${t("firmware.bootloader.body")}
        </p>
        <ol class="radio-transfer-list">
          <li>${t("firmware.bootloader.step1")}</li>
          <li>${t("firmware.bootloader.step2")}</li>
          <li>${t("firmware.bootloader.step3")}</li>
          <li>${t("firmware.bootloader.step4")}</li>
          <li>${t("firmware.bootloader.step5")}</li>
          <li>${t("firmware.bootloader.step6")}</li>
        </ol>
        <p class="risk-text">
          ${t("firmware.bootloader.note")}
        </p>
      </section>

      <section class="card">
        <h2>${t("firmware.backup.heading")}</h2>
        <p class="muted-text">${t("firmware.backup.desc", { kb: Math.round(FIRMWARE_TOTAL_SIZE / 1024) })}</p>
        <button id="firmware-backup-btn" class="button callsign-action-btn" ${canBackup ? "" : "disabled"}>${t("firmware.backup.button")}</button>
      </section>

      <section class="card">
        <h2>${t("workflow.statusHeading")}</h2>
        <p class="muted-text" id="firmware-status">${t("workflow.statusLine", { message: escapeHtml(uiState.firmwareStatusMessage) })}</p>
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
      showToast({ type: "error", message: t("radio.error.webusbNotReady", { blockers: capabilities.blockers.join("\n") }) });
      return;
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      showToast({ type: "error", message: t("radio.error.initFailed") });
      return;
    }
    if (typeof transport.readFirmware !== "function") {
      showToast({ type: "error", message: t("firmware.error.notSupported") });
      return;
    }

    uiState.radioTransport = transport;
    uiState.firmwareBusy = true;
    uiState.firmwareProgressPercent = 0;
    uiState.firmwareProgressVisible = true;
    uiState.firmwareProgressLabel = t("firmware.progress.connecting");
    uiState.firmwareStatusMessage = t("firmware.status.connecting");
    renderState(target, store, store.getState(), channelState, uiState);

    const applyProgress = (progress: BrowserTransferProgress): void => {
      const percent = Math.round((progress.completedBlocks / progress.totalBlocks) * 100);
      uiState.firmwareProgressPercent = percent;
      uiState.firmwareProgressLabel = t("firmware.progress.readingBlock", { done: progress.completedBlocks, total: progress.totalBlocks, kb: Math.round(progress.bytesTransferred / 1024) });
      const bar = target.querySelector<HTMLProgressElement>("#firmware-progress");
      const label = target.querySelector<HTMLElement>("#firmware-progress-label");
      const status = target.querySelector<HTMLElement>("#firmware-status");
      if (bar) bar.value = percent;
      if (label) label.textContent = uiState.firmwareProgressLabel;
      if (status) status.textContent = t("workflow.statusLine", { message: t("firmware.status.readingShort") });
    };

    let connected = false;
    try {
      if (!transport.isConnected()) {
        await transport.connect();
      }
      connected = true;

      uiState.firmwareStatusMessage = t("firmware.status.reading");
      uiState.firmwareProgressLabel = t("firmware.progress.starting");
      renderState(target, store, store.getState(), channelState, uiState);

      const firmware = await transport.readFirmware(applyProgress);
      const stamp = utcStamp();
      const filename = `firmware-backup-${stamp}.bin`;
      downloadBytes(filename, firmware);

      uiState.firmwareStatusMessage = t("firmware.status.complete", { bytes: firmware.byteLength, filename });
      uiState.firmwareProgressPercent = 100;
      uiState.firmwareProgressLabel = t("firmware.progress.complete");
      showToast({ type: "success", message: t("firmware.toast.complete", { kb: Math.round(firmware.byteLength / 1024) }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup failed.";
      uiState.firmwareStatusMessage = t("firmware.status.failed", { message });
      uiState.firmwareProgressVisible = false;
      showToast({ type: "error", message: t("firmware.toast.failed", { message }) });
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
