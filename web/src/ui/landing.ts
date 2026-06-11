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
        <h1>IU2FRL MD380 Codeplug Editor</h1>
        <p>A simple web application to interact with your MD380 codeplug, where everything is done in the browser.</p>
      </section>

      <section class="card risk-card" ${!riskAccepted ? "" : "style='display: none;'"}>
        <h2>Warning</h2>
        <p class="risk-text">
          This app is still under development.<br>
          Not all features were tested and using it may create an unusable codeplug that can freeze your transceiver.<br>
          It is very hard to brick these devices thanks to their robust design and bootloader, but no operation can be considered 100% safe.<br>
          By proceeding, you accept all risk and agree that the project maintainer is not responsible for any device damage or malfunctioning.<br>
          If your transceiver freezes during or after a read/write operation, simply unplug it from the PC and restart it using the volume knob.<br>
        </p>
        <p>
          Please note: 
          <ul>
            <li>This app does not (yet) support OpenGD77 firmware.</li>
            <li>This app only supports original or patched (via <a href="https://github.com/travisgoodspeed/md380tools" target="_blank" rel="nofollow">md380tools</a>) firmwares for MD380 and MD390.</li>
            <li>This app requires Chrome, Edge, or any Chromium-based browser with WebUSB support. Firefox and Safari are not supported due to lack of WebUSB API.</li>
          </ul>
        </p>
        <label class="risk-ack">
          <input id="risk-ack" type="checkbox" ${riskAccepted ? "checked" : ""} ${uiState.busy ? "disabled" : ""}/>
          I understand and accept all risk, including possible device damage or bricking.
        </label>
      </section>

      ${uiState.radioProgressVisible
        ? `
      <section class="card">
        <h2>Radio Transfer Progress</h2>
        <progress id="landing-radio-progress" max="100" value="${uiState.radioProgressPercent}"></progress>
        <p class="muted-text" id="landing-radio-progress-label">${escapeHtml(uiState.radioProgressLabel)}</p>
      </section>
      `
        : ""}
      <section class="tiles">
        <article class="card tile">
          <h2>Setup Guide</h2>
          <p>Instructions for setting up your browser and operating system to communicate with your radio via USB.</p>
          <button id="open-setup-guide-btn" class="button">Show Setup Guide</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Create New Codeplug</h2>
          <p>Start from a blank profile and build your codeplug from scratch.</p>
          <p class="risk-text">
          This feature is in the alpha testing stage and might need further refinements to ensure the generated codeplugs are fully compatible with all radio models and firmware versions.
          </p>
          <div class="actions">
            <button id="create-new-md380-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Create new MD380 codeplug</button>
            <button id="create-new-md390-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Create new MD390 codeplug</button>
          </div>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Open Existing Codeplug</h2>
          <p>Import an existing <code>.rdt</code> or <code>.bin</code> file to edit it safely in-browser.</p>
          <button id="open-existing-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Open .rdt/.bin</button>
          <input id="file-input" type="file" accept=".rdt,.bin" hidden ${riskAccepted && !uiState.busy ? "" : "disabled"} />
          ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Read Codeplug From Radio</h2>
          <p>Connect your radio and load the current codeplug directly into this browser session.</p>
          <button id="landing-read-radio-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Read Codeplug From Radio</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Update Callsign Database</h2>
          <p>Download the latest callsign database and write it to the transceiver.</p>
          <button id="open-callsign-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Update Callsigns Database</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Radio Date and Time Sync</h2>
          <p>Sync date, time, and timezone from this machine to the transceiver clock.</p>
          <button id="open-time-sync-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Sync Date and Time</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Radio Screenshot</h2>
          <p>Capture the current LCD display (160x128 px) from the radio and save it as a PNG. Requires patched firmware, see <a href="https://github.com/travisgoodspeed/md380tools" target="_blank" rel="noopener noreferrer">MD380 Tools</a>.</p>
          <button id="open-screenshot-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Capture Screenshot</button>
        </article>

        <article class="card tile ${riskAccepted && !uiState.busy ? "" : "muted"}">
          <h2>Firmware Backup</h2>
          <p>Create a backup of your radio's firmware (848 KB). Requires entering STM32 bootloader mode manually by turning on the transceiver while pressing PTT and the button above it.</p>
          <button id="open-firmware-workflow-btn" class="button" ${riskAccepted && !uiState.busy ? "" : "disabled"}>Backup Firmware</button>
        </article>
      </section>

      <section class="card tile landing-footer">
        <h2>Credits</h2>
        <p>Developed by <a href="https://github.com/iu2frl" target="_blank" rel="noopener noreferrer">IU2FRL</a> on GitHub Pages and released under the <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GNU General Public License v3</a>.<br>
        ${uiState.callsignLastUpdated ? `Last update: ${escapeHtml(formatCallsignDate(uiState.callsignLastUpdated))}` : ""}.</p>
        <p>This project is open source on <a href="https://github.com/iu2frl/md380-codeplug-editor" target="_blank" rel="noopener noreferrer">GitHub</a>.<br>
        Please report any issues on <a href="https://github.com/iu2frl/md380-codeplug-editor/issues" target="_blank" rel="noopener noreferrer">md380-codeplug-editor/issues</a> and consider contributing if you can!
        </p>
        <p>Special thanks to <a href="https://github.com/travisgoodspeed/md380tools" target="_blank" rel="noopener noreferrer">MD380-Tools</a> and <a href="https://github.com/DaleFarnsworth/codeplug" target="_blank" rel="noopener noreferrer">GO Codeplug</a> as sources of inspiration.</p>
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
