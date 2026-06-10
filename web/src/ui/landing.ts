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

      <section class="card risk-card">
        <h2>Warning</h2>
        <p class="risk-text">
          This app is still under development.<br>
          Not all features were tested and using it may create an unusable codeplug that can freeze your transceiver.<br>
          It is very hard to brick these devices thanks to their robust design and bootloader, but no operation can be considered 100% safe.<br>
          By proceeding, you accept all risk and agree that the project maintainer is not responsible for any device damage or malfunctioning.<br>
          If your transceiver freezes during or after a read/write operation, simply unplug it from the PC and restart it using the volume knob.<br>
          Please note: this app does not (yet) support OpenGD77 firmware. This app only supports original or patched (via <a href="https://github.com/travisgoodspeed/md380tools" target="_blank" rel="nofollow">md380tools</a>) firmwares for MD380 and MD390.
        </p>
        <label class="risk-ack">
          <input id="risk-ack" type="checkbox" ${riskAccepted ? "checked" : ""} />
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
        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Create New Codeplug</h2>
          <p>Start from a blank profile and build your codeplug from scratch.</p>
          <p class="risk-text">
          This feature is in the alpha testing stage and might need further refinements to ensure the generated codeplugs are fully compatible with all radio models and firmware versions.
          </p>
          <div class="actions">
            <button id="create-new-md380-btn" class="button" ${riskAccepted ? "" : "disabled"}>Create new MD380 codeplug</button>
            <button id="create-new-md390-btn" class="button" ${riskAccepted ? "" : "disabled"}>Create new MD390 codeplug</button>
          </div>
        </article>

        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Open Existing Codeplug</h2>
          <p>Import an existing <code>.rdt</code> or <code>.bin</code> file to edit it safely in-browser.</p>
          <button id="open-existing-btn" class="button" ${riskAccepted ? "" : "disabled"}>Open .rdt/.bin</button>
          <button id="open-existing-guide-btn" class="button ghost">Full Step-by-Step Guide</button>
          <input id="file-input" type="file" accept=".rdt,.bin" hidden ${riskAccepted ? "" : "disabled"} />
          ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
        </article>

        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Read From Radio</h2>
          <p>Connect your radio and load the current codeplug directly into this browser session.</p>
          <button id="landing-read-radio-btn" class="button" ${riskAccepted ? "" : "disabled"}>Read From Radio</button>
          <button id="landing-read-guide-btn" class="button ghost">Read Setup Guide</button>
        </article>

        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Callsign Database</h2>
          <p>Download the latest callsign database and write it to the transceiver.</p>
          <button id="open-callsign-workflow-btn" class="button" ${riskAccepted ? "" : "disabled"}>Open Callsign Workflow</button>
        </article>
      </section>
    </main>
  `;
}


export function renderGuideModal(uiState: UiState): string {
  if (!uiState.activeGuideModal) {
    return "";
  }

  if (uiState.activeGuideModal === "import") {
    return `
      <section id="guide-modal" class="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
        <div class="guide-modal-backdrop" data-guide-modal-close="backdrop"></div>
        <article class="guide-modal-card">
          <header class="guide-modal-header">
            <h2 id="guide-modal-title">Open Existing Codeplug</h2>
            <button class="button ghost tiny" data-guide-modal-close="button" aria-label="Close guide">Close</button>
          </header>

          <p>Pick one of these two paths. If this is your first time, use Path A first.</p>

          <h3>Path A: Read Directly in Browser (Fastest)</h3>
          <ol class="radio-transfer-list">
            <li>Check the risk confirmation checkbox on the homepage.</li>
            <li>Click <strong>Read From Radio</strong>.</li>
            <li>If your browser asks for USB permission, select your radio and click allow.</li>
            <li>Wait until read completes, then start editing.</li>
            <li>Export a backup after your first successful read.</li>
          </ol>

          <h3>Path B: Read with Local Helper (Fallback)</h3>
          <ol class="radio-transfer-list">
            <li>Clone the repository from <a href="https://github.com/iu2frl/md380-codeplug-editor" target="_blank" rel="noopener">GitHub</a>.</li>
            <li>Ensure you have Python 3 installed, then install dependencies (see below)</li>
            <li>Open a terminal in the repository root</li>
            <li>Read codeplug with the helper:</li>
          </ol>
          <pre class="code-block">
# Install the requirements (only needed once)
git clone https://github.com/iu2frl/md380-codeplug-editor.git
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv/Scripts/activate
pip install -r tools/requirements.txt
# Get dependencies
./init-examples.sh
# Read from radio and save to artifacts/codeplug/read/my-radio.bin
python3 tools/radio_codeplug_helper.py radio-read --out artifacts/codeplug/read/my-radio.bin
          </pre>
          <ol class="radio-transfer-list" start="3">
            <li>In this app, click <strong>Open .rdt/.bin</strong>.</li>
            <li>Select <code>artifacts/codeplug/read/my-radio.bin</code>.</li>
            <li>Edit, validate, then export your updated file.</li>
            <li>Write back only after creating a backup:</li>
          </ol>
          <pre class="code-block">
# Install the requirements (only needed once)
git clone https://github.com/iu2frl/md380-codeplug-editor.git
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv/Scripts/activate
pip install -r tools/requirements.txt
# Get dependencies
./init-examples.sh
# Write back to the transceiver
python3 tools/radio_codeplug_helper.py radio-write --in artifacts/codeplug/edited/my-radio-updated.bin
          </pre>

          <h3>Useful Links</h3>
          <ul class="radio-transfer-list">
            <li><a href="https://github.com/iu2frl/md380-codeplug-editor/tree/main/tools" target="_blank" rel="noopener">Helper docs (tools folder)</a></li>
            <li><a href="https://github.com/iu2frl/md380-codeplug-editor/blob/main/README.md" target="_blank" rel="noopener">Project README</a></li>
          </ul>
        </article>
      </section>
    `;
  }

  if (uiState.activeGuideModal === "landing-read" || uiState.activeGuideModal === "radio-transfer") {
    return `
      <section id="guide-modal" class="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
        <div class="guide-modal-backdrop" data-guide-modal-close="backdrop"></div>
        <article class="guide-modal-card">
          <header class="guide-modal-header">
            <h2 id="guide-modal-title">Live Read / WebUSB Setup Guide (Windows, Linux, macOS)</h2>
            <button class="button ghost tiny" data-guide-modal-close="button" aria-label="Close guide">Close</button>
          </header>

          <h3>Before You Start</h3>
          <ol class="radio-transfer-list">
            <li>Use a Chromium-based browser (Chrome, Edge, Brave).</li>
            <li>Use HTTPS or localhost (WebUSB requires a secure context).</li>
            <li>Close other apps that may capture the radio USB interface (CPS, serial tools).</li>
            <li>Put radio in programming mode, then connect USB.</li>
          </ol>

          <h3>Windows Driver Setup (Required)</h3>
          <ol class="radio-transfer-list">
            <li>Download and run <a href="https://zadig.akeo.ie" target="_blank" rel="noopener">Zadig</a>.</li>
            <li>In Zadig, open <strong>Options -> List All Devices</strong>.</li>
            <li>Select your device (often <strong>STM32 BOOTLOADER</strong> or <strong>Patched MD380/MD390</strong>).</li>
            <li>Set target driver to <strong>WinUSB</strong> (not LibUSB / LibUsbK).</li>
            <li>Click <strong>Replace Driver</strong>, unplug, then replug radio.</li>
          </ol>

          <h3>Linux Setup</h3>
          <p>Install udev rules once:</p>
          <pre class="code-block">
git clone https://github.com/iu2frl/md380-codeplug-editor.git
sudo cp tools/99-md380.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
          </pre>
          <p class="muted-text">If needed, add your user to plugdev and re-login.</p>

          <h3>macOS Setup</h3>
          <ol class="radio-transfer-list">
            <li>No extra driver is usually required.</li>
            <li>If permission fails, unplug/replug and retry browser permission prompt.</li>
            <li>Ensure no other app is currently connected to the radio USB interface.</li>
          </ol>

          <h3>Read Procedure</h3>
          <ol class="radio-transfer-list">
            <li>Open <strong>Radio Transfer</strong>.</li>
            <li>Click <strong>Connect Device</strong> and pick your radio.</li>
            <li>Click <strong>Read From Radio</strong> and wait for completion.</li>
            <li>Export a backup immediately after loading.</li>
          </ol>

          <h3>Write Procedure</h3>
          <ol class="radio-transfer-list">
            <li>Confirm model compatibility.</li>
            <li>Keep a known-good backup in <code>artifacts/codeplug/backup</code>.</li>
            <li>Click <strong>Write To Radio</strong> only after validation passes.</li>
          </ol>
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

  target.querySelector<HTMLButtonElement>("#open-existing-guide-btn")?.addEventListener("click", () => {
    uiState.activeGuideModal = "import";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#create-new-md380-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    store.createBlank("MD380", "bin");
  });

  target.querySelector<HTMLButtonElement>("#create-new-md390-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    store.createBlank("MD390", "bin");
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
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  target.querySelector<HTMLButtonElement>("#landing-read-guide-btn")?.addEventListener("click", () => {
    uiState.activeGuideModal = "landing-read";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLButtonElement>("#open-callsign-workflow-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    uiState.landingView = "callsign-workflow";
    renderState(target, store, store.getState(), channelState, uiState);
  });
}
