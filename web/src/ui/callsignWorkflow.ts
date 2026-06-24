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
  formatCallsignDate,
} from "./uiHelpers";
import { showToast, showConfirm } from "./dialog";
import { renderLanguageSelector } from "./languageSelector";
import { t } from "../i18n";

const CALLSIGN_FLASH_ADDRESS = 0x100000;
const CALLSIGN_RECOMMENDED_MIN_FLASH = 16 * 1024 * 1024;

var performDatabaseBackup = false;

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
        ${renderLanguageSelector(uiState)}
        <h1>${t("callsign.title")}</h1>
        <p>${t("callsign.intro")}</p>
        <div class="actions">
          <button id="callsign-back-home-btn" class="button ghost">${t("common.backHome")}</button>
        </div>
      </section>

      <section class="card">
        <h2>${t("callsign.step1.heading")}</h2>
        ${uiState.callsignLastUpdated ? `<p class="muted-text">${t("callsign.lastUpdated", { date: escapeHtml(formatCallsignDate(uiState.callsignLastUpdated)) })}</p>` : ""}
        <div class="grid">
          <label>
            ${t("callsign.format.label")}
            <select id="callsign-workflow-format" ${canBuild ? "" : "disabled"}>
              <option value="linear" ${uiState.callsignFormat === "linear" ? "selected" : ""}>${t("callsign.format.linear")}</option>
              <option value="indexed" ${uiState.callsignFormat === "indexed" ? "selected" : ""}>${t("callsign.format.indexed")}</option>
            </select>
          </label>
          <label>
            ${t("callsign.profile.label")}
            <select id="callsign-workflow-profile" ${canBuild ? "" : "disabled"}>
              <option value="global" ${uiState.callsignProfile === "global" ? "selected" : ""}>${t("callsign.profile.global")}</option>
              <option value="eu" ${uiState.callsignProfile === "eu" ? "selected" : ""}>${t("callsign.profile.eu")}</option>
            </select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2>${t("callsign.step2.heading")}</h2>
        <p class="muted-text">${t("callsign.step2.desc")}</p>
        <button id="callsign-workflow-build-btn" class="button callsign-action-btn" ${canBuild ? "" : "disabled"}>${t("callsign.step2.button")}</button>
        ${
          uiState.callsignPayload
            ? `<p class="muted-text"><br>${t("callsign.payloadReady", { name: escapeHtml(uiState.callsignPayloadName), bytes: uiState.callsignPayload.byteLength })}</p>`
            : ""
        }
      </section>

      <section class="card">
        <h2>${t("callsign.step3.heading")}</h2>
        <p class="muted-text">${t("callsign.step3.desc")}</p>
        <label class="perform-db-backup">
          <input id="perform-db-backup" type="checkbox" ${performDatabaseBackup ? "checked" : ""} ${canFlash? "" : "disabled"}/>
          ${t("callsign.backupLabel")}
        </label>
        <button id="callsign-workflow-flash-btn" class="button callsign-action-btn" ${canFlash ? "" : "disabled"}>${t("callsign.step3.button")}</button>
      </section>

      <section class="card">
        <h2>${t("workflow.statusHeading")}</h2>
        <p class="muted-text" id="callsign-status">${t("workflow.statusLine", { message: escapeHtml(uiState.callsignStatusMessage) })}</p>
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

  target.querySelector<HTMLSelectElement>("#callsign-workflow-format")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    uiState.callsignFormat = value === "linear" ? "linear" : "indexed";
  });

  target.querySelector<HTMLSelectElement>("#callsign-workflow-profile")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    uiState.callsignProfile = value === "eu" ? "eu" : "global";
  });

  target.querySelector<HTMLInputElement>("#perform-db-backup")?.addEventListener("change", (event) => {
    performDatabaseBackup = (event.currentTarget as HTMLInputElement).checked;
    renderState(target, store, state, channelState, uiState);
  });

  const ensureRadioTransport = async (): Promise<BrowserRadioTransport> => {
    const capabilities = detectBrowserRadioCapabilities();
    if (!capabilities.supported) {
      throw new Error(t("radio.error.webusbNotReady", { blockers: capabilities.blockers.join("\n") }));
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      throw new Error(t("radio.error.initFailed"));
    }

    uiState.radioTransport = transport;
    if (!transport.isConnected()) {
      const device = await transport.connect();
      const label = [device.manufacturerName, device.productName].filter((item) => Boolean(item)).join(" ").trim();
      uiState.callsignStatusMessage = t("radio.status.connected", { label: label || t("radio.status.usbRadio") });
    }

    return transport;
  };

  target.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.callsignBusy) {
      return;
    }

    var baseUrl = "";
    if (import.meta.env.BASE_URL == "/") {
      console.warn("BASE_URL is '/', using fallback URL for callsign CSV source. This may indicate a misconfiguration in the build or you might be running in a dev environment.");
      baseUrl = "https://iu2frl.github.io/md380-codeplug-editor/";
    } else {
      baseUrl = import.meta.env.BASE_URL;
    }
    const source = `${baseUrl}user.csv`;

    uiState.callsignBusy = true;
    uiState.callsignProgressVisible = true;
    uiState.callsignProgressPercent = 0;
    uiState.callsignProgressLabel = t("callsign.progress.downloadingCsv");
    uiState.callsignStatusMessage = t("callsign.status.downloadingCsv");
    renderState(target, store, store.getState(), channelState, uiState);

    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        console.error("Failed to download CSV from ${source}. HTTP status: ", response.status);
        throw new Error(t("callsign.error.downloadFailed", { status: response.status }));
      }
      const rawCsv = await response.text();

      if (!rawCsv || rawCsv.trim() === "" || rawCsv.trim().length < 10) {
        console.error("Downloaded CSV is empty or too short. Content starts with:", rawCsv.slice(0, 200));
        throw new Error(t("callsign.error.csvEmpty"));
      }

      const firstLine = rawCsv.split("\n", 1)[0].trim();
      if (firstLine != "RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY")
      {
        console.error("Unexpected CSV format. First line:", firstLine);
        throw new Error(t("callsign.error.csvFormat"));
      }

      uiState.callsignProgressPercent = 30;
      uiState.callsignProgressLabel = t("callsign.progress.building");
      uiState.callsignStatusMessage = t("callsign.status.building");
      renderState(target, store, store.getState(), channelState, uiState);

      // Yield to browser so progress UI updates before heavy computation
      await new Promise((resolve) => setTimeout(resolve, 50));

      const built = buildCallsignDatabase(rawCsv, uiState.callsignFormat, uiState.callsignProfile);
      const stamp = utcStamp();
      uiState.callsignPayload = built.payload;
      uiState.callsignPayloadName = `callsign-${uiState.callsignFormat}-${stamp}.bin`;
      uiState.callsignProgressPercent = 100;
      uiState.callsignProgressLabel = t("callsign.progress.buildComplete");
      uiState.callsignStatusMessage = t("callsign.status.buildComplete", { bytes: built.payload.byteLength, format: uiState.callsignFormat, profile: uiState.callsignProfile });
      showToast({ type: "success", message: t("callsign.toast.buildComplete", { bytes: built.payload.byteLength }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Callsign build failed.";
      uiState.callsignStatusMessage = t("callsign.status.buildFailed", { message });
      uiState.callsignProgressVisible = false;
      showToast({ type: "error", message: t("callsign.toast.buildFailed", { message }) });
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
      showToast({ type: "warning", message: t("callsign.toast.buildFirst") });
      return;
    }

    const confirmed = await showConfirm({
      title: t("callsign.confirm.flashTitle"),
      message: t("callsign.confirm.flashMessage", { bytes: uiState.callsignPayload.byteLength, address: CALLSIGN_FLASH_ADDRESS.toString(16) }),
      confirmLabel: t("callsign.confirm.flashConfirm"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    uiState.callsignBusy = true;
    uiState.callsignProgressVisible = true;
    uiState.callsignProgressPercent = 0;
    uiState.callsignProgressLabel = t("callsign.progress.preparingFlash");
    uiState.callsignStatusMessage = t("callsign.status.preparingFlash");
    renderState(target, store, store.getState(), channelState, uiState);

    const applyProgress = (progress: BrowserTransferProgress): void => {
      setCallsignProgress(uiState, progress);
      syncRadioProgressUi(target, uiState);
    };

    const safeRebootRadio = async (transport: BrowserRadioTransport): Promise<void> => {
      if (typeof transport.rebootRadio === "function") {
        await transport.rebootRadio();
      }
    };

    try {
      const transport = await ensureRadioTransport();
      const flashSize = await transport.getSpiFlashSize();
      if (flashSize < CALLSIGN_RECOMMENDED_MIN_FLASH) {
        throw new Error(t("callsign.error.flashSize", { size: flashSize, min: CALLSIGN_RECOMMENDED_MIN_FLASH }));
      }
      if (CALLSIGN_FLASH_ADDRESS + uiState.callsignPayload.byteLength > flashSize) {
        throw new Error(t("callsign.error.flashBounds", { total: flashSize }));
      }

      // TODO: not sure what to do with the backup, maybe we should implement a restore feature?
      var rollbackName = "";
      if (performDatabaseBackup)
      {
        uiState.callsignProgressVisible = true;
        uiState.callsignProgressPercent = 0;
        uiState.callsignProgressLabel = t("callsign.progress.readingRollback");
        renderState(target, store, store.getState(), channelState, uiState);
        const backup = await transport.readSpiFlashRegion(CALLSIGN_FLASH_ADDRESS, uiState.callsignPayload.byteLength, applyProgress);
        rollbackName = `callsign-backup-${utcStamp()}.bin`;
        downloadBytes(rollbackName, backup);
      }

      // TODO: the original code was deleting the flash before writing the new DB
      uiState.callsignProgressVisible = true;
      uiState.callsignProgressPercent = 0;
      uiState.callsignProgressLabel = t("callsign.progress.preparingDbFlash");
      renderState(target, store, store.getState(), channelState, uiState);
      await transport.writeSpiFlashRegion(CALLSIGN_FLASH_ADDRESS, uiState.callsignPayload, applyProgress);
      uiState.callsignStatusMessage = t("callsign.status.flashComplete", { bytes: uiState.callsignPayload.byteLength, address: CALLSIGN_FLASH_ADDRESS.toString(16) });
      uiState.callsignProgressPercent = 100;
      uiState.callsignProgressLabel = t("callsign.progress.flashComplete");
      renderState(target, store, store.getState(), channelState, uiState);
      if (performDatabaseBackup)
      {
        showToast({ type: "success", message: t("callsign.toast.flashCompleteBackup", { name: rollbackName }) });
      }
      else
      {
        showToast({ type: "success", message: t("callsign.toast.flashComplete") });
      }
      await safeRebootRadio(transport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Flash failed.";
      uiState.callsignStatusMessage = t("callsign.status.flashFailed", { message });
      uiState.callsignProgressVisible = false;
      showToast({ type: "error", message: t("callsign.toast.flashFailed", { message }) });
    } finally {
      uiState.callsignBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  void state;
}
