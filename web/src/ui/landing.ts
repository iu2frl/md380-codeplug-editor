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
            <h2 id="guide-modal-title">WebUSB Setup Guide</h2>
            <button class="button ghost tiny" data-guide-modal-close="button" aria-label="Close guide">Close</button>
          </header>

          <h3>Prerequisites</h3>
          <ol class="radio-transfer-list">
            <li>Use a <strong>Chromium-based browser</strong> (Chrome, Edge, Brave). Firefox and Safari do not support WebUSB.</li>
            <li>Use <strong>HTTPS</strong> or <strong>localhost</strong> (WebUSB requires a secure context).</li>
            <li>Close any other apps that may capture the radio USB interface (CPS software, serial tools).</li>
            <li>To operate on the firmware, put your radio in <strong>programming mode</strong> before connecting USB by holding <strong>PTT and the button above it</strong> while powering on the radio.</li>
            <li>To operate on codeplug, callsign database, RTC clock, or screenshots, simply connect the radio via USB in <strong>normal mode</strong>.</li>
          </ol>

          <h3>Windows Setup</h3>
          <p>Windows requires installing the WinUSB driver using Zadig:</p>
          <ol class="radio-transfer-list">
            <li>Download and run <a href="https://zadig.akeo.ie" target="_blank" rel="noopener noreferrer nofollow">Zadig</a>.</li>
            <li>In Zadig, open <strong>Options &rarr; List All Devices</strong>.</li>
            <li>Select your device (usually shows as <strong>STM32 BOOTLOADER</strong> or <strong>Patched MD380/MD390</strong>).</li>
            <li>Set target driver to <strong>WinUSB</strong> (not LibUSB or LibUsbK).</li>
            <li>Click <strong>Replace Driver</strong>, then unplug and replug your radio.</li>
          </ol>
          <p>If Zadig shows <strong>GuiSTDFUDev</strong> as installed driver, you will need to manually uninstall it from Device Manager and then install WinUSB with Zadig.</p>

          <h3>Linux Setup</h3>
          <p>Linux requires udev rules to grant USB access without root. Copy the rules file from the repository:</p>
          <pre class="code-block">
git clone https://github.com/iu2frl/md380-codeplug-editor.git
sudo cp md380-codeplug-editor/tools/99-md380.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
          </pre>
          <p class="muted-text">If needed, add your user to the <code>plugdev</code> group and re-login.</p>

          <h3>macOS Setup</h3>
          <ol class="radio-transfer-list">
            <li>No extra driver is usually required on macOS.</li>
            <li>If the browser permission prompt fails, unplug and replug the radio, then try again.</li>
            <li>Ensure no other app is currently using the radio USB interface.</li>
          </ol>

          <h3>Using the App</h3>
          <ol class="radio-transfer-list">
            <li>Accept the risk acknowledgment on the homepage.</li>
            <li>Click <strong>Read From Radio</strong> to load your current codeplug.</li>
            <li>When prompted, select your radio from the browser USB permission dialog.</li>
            <li>After reading, export a backup before making changes.</li>
            <li>Edit your codeplug (channels, zones, contacts, settings).</li>
            <li>Click <strong>Write To Radio</strong> to save changes back to your radio.</li>
          </ol>

          <h3>Useful Links</h3>
          <ul class="radio-transfer-list">
            <li><a href="https://zadig.akeo.ie" target="_blank" rel="noopener">Zadig USB driver installer (Windows)</a></li>
            <li><a href="https://github.com/travisgoodspeed/md380tools" target="_blank" rel="noopener">MD380 Tools (patched firmware)</a></li>
            <li><a href="https://github.com/iu2frl/md380-codeplug-editor" target="_blank" rel="noopener">Project GitHub</a></li>
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
      showToast({ type: "error", message: `WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}` });
      return;
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      showToast({ type: "error", message: "Unable to initialize WebUSB transport in this browser." });
      return;
    }

    let connected = false;
    try {
      uiState.busy = true;
      uiState.radioTransport = transport;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "Starting radio read...";
      renderState(target, store, store.getState(), channelState, uiState);
      await transport.connect();
      connected = true;
      const bytes = await transport.readCodeplug(applyProgress);
      store.load("radio-read.bin", bytes);
      const loadedState = store.getState();
      if (!loadedState.document) {
        throw new Error(loadedState.importError ?? "Read completed but codeplug parsing failed.");
      }

      // Codeplug payload does not contain device metadata (maker, MCU, unique
      // device ID). Query the radio directly so the Basic tab can show it.
      if (transport.readDeviceInfo) {
        uiState.radioProgressLabel = "Reading device information...";
        syncRadioProgressUi(target, uiState);
        try {
          const deviceInfo = await transport.readDeviceInfo();
          store.applyRadioDeviceInfo(deviceInfo);
        } catch (deviceInfoError) {
          console.debug("Device info read failed: ", deviceInfoError);
        }
      }

      uiState.radioStatusMessage = `Read complete: ${bytes.byteLength} bytes loaded into editor.`;
      uiState.radioProgressPercent = 100;
      uiState.radioProgressLabel = "Read complete.";
      showToast({ type: "success", message: `Read complete: ${bytes.byteLength} bytes loaded into editor.` });
      await transport.rebootRadio();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Read failed.";
      uiState.radioStatusMessage = `Read failed: ${message}`;
      uiState.radioProgressVisible = false;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "";
      showToast({ type: "error", message: `Read failed: ${message}` });
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
