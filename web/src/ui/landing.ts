import type { AppState, EditorStore } from "../state/store";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  type BrowserTransferProgress,
} from "../transport/browserRadio";
import type { ChannelPanelState, UiState } from "./uiTypes";
import {
  escapeHtml,
  setRadioProgress,
  syncRadioProgressUi,
  formatCallsignDate,
} from "./uiHelpers";
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

export function renderLanding(importError: string | undefined, riskAccepted: boolean, uiState: UiState): string {
  return `
    <main class="layout">
      <section class="hero card">
        ${renderLanguageSelector(uiState)}
        <h1>${t("app.title")}</h1>
        <p>${t("landing.intro")}</p>
      </section>

      <section class="card risk-card" ${!riskAccepted ? "" : "style='display: none;'"}>
        <h2>${t("landing.risk.heading")}</h2>
        <p class="risk-text">
          ${t("landing.risk.body")}
        </p>
        <p>
          ${t("landing.risk.noteIntro")}
          <ul>
            <li>${t("landing.risk.note.opengd77")}</li>
            <li>${t("landing.risk.note.firmwares")}</li>
            <li>${t("landing.risk.note.browser")}</li>
          </ul>
        </p>
        <label class="risk-ack">
          <input id="risk-ack" type="checkbox" ${riskAccepted ? "checked" : ""} ${uiState.busy ? "disabled" : ""}/>
          ${t("landing.risk.ack")}
        </label>
      </section>

      ${uiState.radioProgressVisible
        ? `
      <section class="card">
        <h2>${t("landing.radioProgress.heading")}</h2>
        <progress id="landing-radio-progress" max="100" value="${uiState.radioProgressPercent}"></progress>
        <p class="muted-text" id="landing-radio-progress-label">${escapeHtml(uiState.radioProgressLabel)}</p>
      </section>
      `
        : ""}
      <section class="tiles">
        <article class="card tile">
          <h2>${t("landing.tile.setup.heading")}</h2>
          <p>${t("landing.tile.setup.desc")}</p>
          <button id="open-setup-guide-btn" class="button">${t("landing.tile.setup.button")}</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.create.heading")}</h2>
          <p>${t("landing.tile.create.desc")}</p>
          <p class="risk-text">
          ${t("landing.tile.create.alpha")}
          </p>
          <div class="actions">
            <button id="create-new-md380-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.create.md380")}</button>
            <button id="create-new-md390-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.create.md390")}</button>
          </div>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.open.heading")}</h2>
          <p>${t("landing.tile.open.desc1")}
          <p>${t("landing.tile.open.desc2")}</p>
          <button id="open-existing-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.open.button")}</button>
          <input id="file-input" type="file" accept=".rdt,.bin" hidden ${riskAccepted && !uiState.busy ? "" : "disabled"} />
          ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.read.heading")}</h2>
          <p>${t("landing.tile.read.desc")}</p>
          <button id="landing-read-radio-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.read.button")}</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.callsign.heading")}</h2>
          <p>${t("landing.tile.callsign.desc")}</p>
          <button id="open-callsign-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.callsign.button")}</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.timeSync.heading")}</h2>
          <p>${t("landing.tile.timeSync.desc")}</p>
          <button id="open-time-sync-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.timeSync.button")}</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.screenshot.heading")}</h2>
          <p>${t("landing.tile.screenshot.desc")}</p>
          <button id="open-screenshot-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.screenshot.button")}</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>${t("landing.tile.firmware.heading")}</h2>
          <p>${t("landing.tile.firmware.desc")}</p>
          <button id="open-firmware-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>${t("landing.tile.firmware.button")}</button>
        </article>
      </section>

      <section class="card tile landing-footer">
        <h2>${t("landing.credits.heading")}</h2>
        <p>${t("landing.credits.body1")}<br>
        ${uiState.callsignLastUpdated ? t("landing.credits.lastUpdate", { date: escapeHtml(formatCallsignDate(uiState.callsignLastUpdated)) }) : ""}.</p>
        <p>${t("landing.credits.body2")}
        </p>
        <p>${t("landing.credits.body3")}</p>
      </section>
    </main>
  `;
}


export function renderGuideModal(uiState: UiState): string {
  if (!uiState.activeGuideModal) {
    return "";
  }

  if (uiState.activeGuideModal === "setup" || uiState.activeGuideModal === "landing-read" || uiState.activeGuideModal === "radio-transfer") {
    return `
      <section id="guide-modal" class="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
        <div class="guide-modal-backdrop" data-guide-modal-close="backdrop"></div>
        <article class="guide-modal-card">
          <header class="guide-modal-header">
            <h2 id="guide-modal-title">${t("guide.title")}</h2>
            <button class="button ghost tiny" data-guide-modal-close="button" aria-label="${t("guide.closeAria")}">${t("common.close")}</button>
          </header>

          <h3>${t("guide.prereq.heading")}</h3>
          <ol class="radio-transfer-list">
            <li>${t("guide.prereq.1")}</li>
            <li>${t("guide.prereq.2")}</li>
            <li>${t("guide.prereq.3")}</li>
            <li>${t("guide.prereq.4")}</li>
            <li>${t("guide.prereq.5")}</li>
          </ol>

          <h3>${t("guide.windows.heading")}</h3>
          <p>${t("guide.windows.intro")}</p>
          <ol class="radio-transfer-list">
            <li>${t("guide.windows.1")}</li>
            <li>${t("guide.windows.2")}</li>
            <li>${t("guide.windows.3")}</li>
            <li>${t("guide.windows.4")}</li>
            <li>${t("guide.windows.5")}</li>
          </ol>
          <p>${t("guide.windows.note")}</p>

          <h3>${t("guide.linux.heading")}</h3>
          <p>${t("guide.linux.intro")}</p>
          <pre class="code-block">
git clone https://github.com/iu2frl/md380-codeplug-editor.git
sudo cp md380-codeplug-editor/tools/99-md380.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
          </pre>
          <p class="muted-text">${t("guide.linux.note")}</p>

          <h3>${t("guide.macos.heading")}</h3>
          <ol class="radio-transfer-list">
            <li>${t("guide.macos.1")}</li>
            <li>${t("guide.macos.2")}</li>
            <li>${t("guide.macos.3")}</li>
          </ol>

          <h3>${t("guide.app.heading")}</h3>
          <ol class="radio-transfer-list">
            <li>${t("guide.app.1")}</li>
            <li>${t("guide.app.2")}</li>
            <li>${t("guide.app.3")}</li>
            <li>${t("guide.app.4")}</li>
            <li>${t("guide.app.5")}</li>
            <li>${t("guide.app.6")}</li>
          </ol>

          <h3>${t("guide.links.heading")}</h3>
          <ul class="radio-transfer-list">
            <li>${t("guide.links.zadig")}</li>
            <li>${t("guide.links.md380tools")}</li>
            <li>${t("guide.links.github")}</li>
          </ul>
        </article>
      </section>
    `;
  }

  return "";
}

export function bindGuideModalActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  const closeModal = (): void => {
    if (!uiState.activeGuideModal) {
      return;
    }
    uiState.activeGuideModal = null;
    renderState(target, store, store.getState(), channelState, uiState);
  };

  for (const element of target.querySelectorAll<HTMLElement>("[data-guide-modal-close]")) {
    element.addEventListener("click", closeModal);
  }

  target.querySelector<HTMLElement>("#guide-modal")?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  void state;
}

export function bindLandingActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  const applyProgress = (progress: BrowserTransferProgress): void => {
    setRadioProgress(uiState, progress);
    syncRadioProgressUi(target, uiState);
  };

  // Fetch callsign metadata on load if not already fetched
  if (!uiState.callsignLastUpdated) {
    var baseUrl = "";
    if (import.meta.env.BASE_URL == "/") {
      console.warn("BASE_URL is '/', using fallback URL for callsign metadata. This may indicate a misconfiguration in the build or you might be running in a dev environment.");
      baseUrl = "https://iu2frl.github.io/md380-codeplug-editor/";
    } else {
      baseUrl = import.meta.env.BASE_URL;
    }
    fetch(`${baseUrl}callsign-meta.json`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (meta?.updatedAt) {
          uiState.callsignLastUpdated = meta.updatedAt;
          renderState(target, store, store.getState(), channelState, uiState);
        }
      })
      .catch(() => {});
  }

  target.querySelector<HTMLInputElement>("#risk-ack")?.addEventListener("change", (event) => {
    uiState.riskAccepted = (event.currentTarget as HTMLInputElement).checked;
    renderState(target, store, state, channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#open-existing-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    target.querySelector<HTMLInputElement>("#file-input")?.click();
  });

  target.querySelector<HTMLButtonElement>("#open-setup-guide-btn")?.addEventListener("click", () => {
    uiState.activeGuideModal = "setup";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#create-new-md380-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    store.createBlank("MD380", "bin");
    uiState.busy = false;
  });

  target.querySelector<HTMLButtonElement>("#create-new-md390-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    store.createBlank("MD390", "bin");
    uiState.busy = false;
  });

  target.querySelector<HTMLButtonElement>("#landing-read-radio-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted) {
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

    let connected = false;
    try {
      uiState.busy = true;
      uiState.radioTransport = transport;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = t("landing.read.starting");
      renderState(target, store, store.getState(), channelState, uiState);
      await transport.connect();
      connected = true;
      const bytes = await transport.readCodeplug(applyProgress);
      store.load("radio-read.bin", bytes);
      const loadedState = store.getState();
      if (!loadedState.document) {
        throw new Error(loadedState.importError ?? t("landing.read.parseFailed"));
      }

      // Codeplug payload does not contain device metadata (maker, MCU, unique
      // device ID). Query the radio directly so the Basic tab can show it.
      if (transport.readDeviceInfo) {
        uiState.radioProgressLabel = t("landing.read.deviceInfo");
        syncRadioProgressUi(target, uiState);
        try {
          const deviceInfo = await transport.readDeviceInfo();
          store.applyRadioDeviceInfo(deviceInfo);
        } catch (deviceInfoError) {
          console.debug("Device info read failed: ", deviceInfoError);
        }
      }

      uiState.radioStatusMessage = t("landing.read.complete", { bytes: bytes.byteLength });
      uiState.radioProgressPercent = 100;
      uiState.radioProgressLabel = t("landing.read.completeLabel");
      showToast({ type: "success", message: t("landing.read.complete", { bytes: bytes.byteLength }) });
      await transport.rebootRadio();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Read failed.";
      uiState.radioStatusMessage = t("landing.read.failed", { message });
      uiState.radioProgressVisible = false;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "";
      showToast({ type: "error", message: t("landing.read.failed", { message }) });
    } finally {
      if (connected) {
        try {
          await transport.disconnect();
        } catch {
          // Ignore disconnect cleanup errors after a read attempt.
        }
      }
      uiState.radioTransport = null;
      uiState.busy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  target.querySelector<HTMLButtonElement>("#open-callsign-workflow-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    uiState.landingView = "callsign-workflow";
    uiState.busy = false;
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#open-time-sync-workflow-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    uiState.landingView = "time-sync-workflow";
    uiState.busy = false;
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#open-screenshot-workflow-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    uiState.landingView = "screenshot-workflow";
    uiState.busy = false;
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#open-firmware-workflow-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.busy = true;
    uiState.landingView = "firmware-workflow";
    uiState.busy = false;
    renderState(target, store, store.getState(), channelState, uiState);
  });
}
