import type { AppState, EditorStore } from "../state/store";
import { radioButtonActionOptions } from "../domain/parser";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  type BrowserTransferProgress,
  type BrowserRadioTransport,
} from "../transport/browserRadio";

interface ChannelPanelState {
  query: string;
  modeFilter: "all" | "Analog" | "Digital";
  bulkMode: "" | "Analog" | "Digital";
  bulkPower: "" | "Low" | "High";
}

type ActiveTab =
  | "basic"
  | "general"
  | "menus"
  | "buttons"
  | "digital-text"
  | "encryption"
  | "digital-contacts"
  | "zones"
  | "group-lists"
  | "scan-lists"
  | "channels"
  | "radio-transfer";

interface UiState {
  activeTab: ActiveTab;
  riskAccepted: boolean;
  selectedZoneId: number | null;
  selectedChannelId: number | null;
  channelsListScrollTop: number;
  radioTransport: BrowserRadioTransport | null;
  radioStatusMessage: string;
  radioBusy: boolean;
  radioProgressPercent: number;
  radioProgressLabel: string;
  radioProgressVisible: boolean;
}

const TIME_ZONE_OPTIONS = [
  "UTC-12:00",
  "UTC-11:00",
  "UTC-10:00",
  "UTC-9:00",
  "UTC-8:00",
  "UTC-7:00",
  "UTC-6:00",
  "UTC-5:00",
  "UTC-4:00",
  "UTC-3:00",
  "UTC-2:00",
  "UTC-1:00",
  "UTC+0:00",
  "UTC+1:00",
  "UTC+2:00",
  "UTC+3:00",
  "UTC+4:00",
  "UTC+5:00",
  "UTC+6:00",
  "UTC+7:00",
  "UTC+8:00",
  "UTC+9:00",
  "UTC+10:00",
  "UTC+11:00",
  "UTC+12:00",
];

function downloadBytes(fileName: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function setRadioProgress(uiState: UiState, progress: BrowserTransferProgress): void {
  uiState.radioProgressVisible = true;
  uiState.radioProgressPercent = Math.min(100, Math.round((progress.completedBlocks / progress.totalBlocks) * 100));
  uiState.radioProgressLabel = `${progress.direction === "read" ? "Reading" : "Writing"} ${progress.completedBlocks}/${progress.totalBlocks} blocks (${uiState.radioProgressPercent}%).`;
}

function syncRadioProgressUi(target: HTMLElement, uiState: UiState): void {
  const landingProgress = target.querySelector<HTMLProgressElement>("#landing-radio-progress");
  if (landingProgress) {
    landingProgress.value = uiState.radioProgressPercent;
  }
  const landingLabel = target.querySelector<HTMLElement>("#landing-radio-progress-label");
  if (landingLabel) {
    landingLabel.textContent = uiState.radioProgressLabel;
  }

  const transferWrap = target.querySelector<HTMLElement>("#radio-transfer-progress-wrap");
  if (transferWrap) {
    transferWrap.classList.toggle("hidden", !uiState.radioProgressVisible);
  }
  const transferProgress = target.querySelector<HTMLProgressElement>("#radio-transfer-progress");
  if (transferProgress) {
    transferProgress.value = uiState.radioProgressPercent;
  }
  const transferLabel = target.querySelector<HTMLElement>("#radio-transfer-progress-label");
  if (transferLabel) {
    transferLabel.textContent = uiState.radioProgressLabel;
  }
}

export function renderApp(target: HTMLElement, store: EditorStore): void {
  const channelState: ChannelPanelState = {
    query: "",
    modeFilter: "all",
    bulkMode: "",
    bulkPower: "",
  };

  const uiState: UiState = {
    activeTab: "basic",
    riskAccepted: false,
    selectedZoneId: null,
    selectedChannelId: null,
    channelsListScrollTop: 0,
    radioTransport: null,
    radioStatusMessage: "Not connected.",
    radioBusy: false,
    radioProgressPercent: 0,
    radioProgressLabel: "No transfer in progress.",
    radioProgressVisible: false,
  };

  store.subscribe((state) => renderState(target, store, state, channelState, uiState));
}

function renderState(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
): void {
  if (!state.document) {
    target.innerHTML = renderLanding(state.importError, uiState.riskAccepted, uiState);
    bindFileInputs(target, store);
    bindLandingActions(target, store, state, channelState, uiState);
    return;
  }

  if (uiState.activeTab === "channels") {
    const channelsList = target.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (channelsList) {
      uiState.channelsListScrollTop = channelsList.scrollTop;
    }
  }

  target.innerHTML = renderLoadedLayout(state, uiState);
  bindFileInputs(target, store);
  bindTopActions(target, store, state);
  bindTabs(target, uiState, state, store, channelState);

  const activeTab = target.querySelector<HTMLElement>("#active-tab-panel");
  const validation = target.querySelector<HTMLElement>("#validation");
  if (!activeTab || !validation) {
    return;
  }

  const { document } = state;
  const activeContent = renderActiveTab(document, uiState.activeTab, channelState, uiState);
  activeTab.innerHTML = activeContent;

  validation.innerHTML = `
    <h2>Validation</h2>
    ${
      state.validationIssues.length === 0
        ? "<p class=\"ok\">No validation issues.</p>"
        : `<ul>${state.validationIssues
            .map((issue) => `<li class="${issue.level}">[${issue.code}] ${issue.message}</li>`)
            .join("")}</ul>`
    }
  `;

  bindActiveTab(target, store, state, channelState, uiState);

  if (uiState.activeTab === "channels") {
    const channelsList = target.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (channelsList) {
      channelsList.scrollTop = uiState.channelsListScrollTop;
    }
  }
}

function renderLanding(importError: string | undefined, riskAccepted: boolean, uiState: UiState): string {
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
          If your transceiver freezes during or after a read/write operation, simply unplug it from the PC and restart it using the volume knob.
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
          <ol>
            <li>See: <a href="https://github.com/iu2frl/md380-codeplug-editor/tree/main/tools" target="_blank">tools</a> for instructions.</li>
            <li>Select the generated <code>.rdt</code> or <code>.bin</code> file below.</li>
            <li>Edit and export, then write back with <code>radio-write</code>.</li>
          </ol>
          <button id="open-existing-btn" class="button" ${riskAccepted ? "" : "disabled"}>Open .rdt/.bin</button>
          <input id="file-input" type="file" accept=".rdt,.bin" hidden ${riskAccepted ? "" : "disabled"} />
          ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
        </article>

        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Read From Radio</h2>
          <ol>
            <li>Connect radio in programming mode and approve WebUSB access.</li>
            <li>Read codeplug directly into this browser session.</li>
            <li>Edit and export or write back from Radio Transfer.</li>
          </ol>
          <button id="landing-read-radio-btn" class="button" ${riskAccepted ? "" : "disabled"}>Read From Radio</button>
        </article>
      </section>
    </main>
  `;
}

function bindLandingActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
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
      window.alert(`WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}`);
      return;
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      window.alert("Unable to initialize WebUSB transport in this browser.");
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
      window.alert(`Read complete: ${bytes.byteLength} bytes loaded into editor.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Read failed.";
      uiState.radioStatusMessage = `Read failed: ${message}`;
      uiState.radioProgressVisible = false;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "";
      window.alert(`Read failed: ${message}`);
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
}

function renderLoadedLayout(state: AppState, uiState: UiState): string {
  const document = state.document;
  if (!document) {
    return "";
  }

  return `
    <main class="layout">
      <section class="hero card">
        <h1>IU2FRL MD380 Codeplug Editor</h1>
        <p>Loaded: ${escapeHtml(document.fileName)} (${document.format.toUpperCase()})</p>
        <p class="status-line">
          <span class="status-badge ${state.isDirty ? "dirty" : "clean"}">${state.isDirty ? "Unsaved changes" : "Saved"}</span>
          <span class="status-meta">Undo: ${state.undoCount} | Redo: ${state.redoCount}</span>
        </p>
        <div class="actions">
          <label class="button">
            Open Another File
            <input id="file-input" type="file" accept=".rdt,.bin" hidden />
          </label>
          <button id="undo-btn" class="button ghost" ${state.undoCount === 0 ? "disabled" : ""}>Undo</button>
          <button id="redo-btn" class="button ghost" ${state.redoCount === 0 ? "disabled" : ""}>Redo</button>
          <button id="export-btn" class="button ghost">Export Current File</button>
        </div>
      </section>

      <section class="card tabs-card">
        <div class="tabs" role="tablist" aria-label="Codeplug sections">
          ${renderTabButton("basic", "Basic", uiState.activeTab, false)}
          ${renderTabButton("general", "General", uiState.activeTab, false)}
          ${renderTabButton("menus", "Menus", uiState.activeTab, false)}
          ${renderTabButton("buttons", "Buttons", uiState.activeTab, false)}
          ${renderTabButton("digital-text", "Digital Text Message", uiState.activeTab, false)}
          ${renderTabButton("encryption", "Encryption", uiState.activeTab, false)}
          ${renderTabButton("digital-contacts", "Digital Contacts", uiState.activeTab, false)}
          ${renderTabButton("zones", "Zones", uiState.activeTab, false)}
          ${renderTabButton("group-lists", "Group Lists", uiState.activeTab, false)}
          ${renderTabButton("scan-lists", "Scan Lists", uiState.activeTab, false)}
          ${renderTabButton("channels", "Channels", uiState.activeTab, false)}
          ${renderTabButton("radio-transfer", "Radio Transfer", uiState.activeTab, false)}
        </div>
        <article id="active-tab-panel" class="tab-panel"></article>
      </section>

      <section class="card" id="validation"></section>
    </main>
  `;
}

function renderTabButton(id: string, label: string, activeTab: ActiveTab, disabled: boolean): string {
  const isActive = id === activeTab;
  return `
    <button
      class="tab ${isActive ? "active" : ""}"
      ${disabled ? "disabled" : ""}
      data-tab="${id}"
      role="tab"
      aria-selected="${isActive ? "true" : "false"}"
    >
      ${label}
    </button>
  `;
}

function renderActiveTab(document: NonNullable<AppState["document"]>, activeTab: ActiveTab, channelState: ChannelPanelState, uiState: UiState): string {
  if (activeTab === "basic") {
    const basic = document.basicInfo;
    return `
      <h2>Basic</h2>
      <dl>
        <div><dt>Model</dt><dd>${escapeHtml(document.model || "Unknown")}</dd></div>
        <div><dt>Maker</dt><dd>${escapeHtml(inferMaker(document.model))}</dd></div>
        <div><dt>Firmware Version</dt><dd>${escapeHtml(basic.firmwareVersion || "Not stored in codeplug")}</dd></div>
        <div><dt>CPS Version</dt><dd>${escapeHtml(basic.cpsVersion || "Unknown")}</dd></div>
        <div><dt>MCU Version</dt><dd>${escapeHtml(basic.mcuVersion || "Not stored in codeplug")}</dd></div>
        <div><dt>Unique Device ID</dt><dd>${escapeHtml(basic.uniqueDeviceId || "Not stored in codeplug")}</dd></div>
        <div><dt>Frequency Range</dt><dd>${escapeHtml(basic.frequencyRange || "Unknown")}</dd></div>
        <div><dt>Last Programmed</dt><dd>${escapeHtml(basic.lastProgrammedTime || "Unknown")}</dd></div>
        <div><dt>Variant</dt><dd>${document.variant}</dd></div>
      </dl>
    `;
  }

  if (activeTab === "general") {
    return `
      <h2>General</h2>
      <div class="general-grid">
        <section class="general-section">
          <h3>Identity</h3>
          <label>
            Radio Name
            <input id="radio-name" type="text" value="${escapeHtml(document.settings.radioName)}" maxlength="16" />
            <small class="field-help">Max 16 characters.</small>
            <small id="radio-name-error" class="field-error"></small>
          </label>
          <label>
            DMR ID
            <input id="radio-id" type="number" value="${document.settings.radioId}" min="1" step="1" />
            <small class="field-help">Valid range: 1 to 16,777,215.</small>
            <small id="radio-id-error" class="field-error"></small>
          </label>
          <label>
            Boot Up Message Line 1
            <input id="boot-line-1" type="text" maxlength="10" value="${escapeHtml(document.settings.bootUpMessageLine1)}" />
            <small class="field-help">Up to 10 characters.</small>
            <small id="boot-line-1-error" class="field-error"></small>
          </label>
          <label>
            Boot Up Message Line 2
            <input id="boot-line-2" type="text" maxlength="10" value="${escapeHtml(document.settings.bootUpMessageLine2)}" />
            <small class="field-help">Up to 10 characters.</small>
            <small id="boot-line-2-error" class="field-error"></small>
          </label>
        </section>

        <section class="general-section disabled-grid">
          <h3>Behavior</h3>
          <label>
            VOX Sensitivity
            <input id="vox-sensitivity" type="number" min="1" max="10" step="1" value="${document.settings.voxSensitivity}" />
            <small id="vox-sensitivity-error" class="field-error"></small>
          </label>
          <label>
            TX Preamble Duration (ms)
            <input id="tx-preamble-duration" type="number" min="0" max="8640" step="60" value="${document.settings.txPreambleDurationMs}" />
            <small id="tx-preamble-duration-error" class="field-error"></small>
          </label>
          <label>
            RX Low Battery Alarm Interval (s)
            <input id="rx-low-battery-interval" type="number" min="0" max="635" step="5" value="${document.settings.rxLowBatteryIntervalSec}" />
            <small id="rx-low-battery-interval-error" class="field-error"></small>
          </label>
        <label>
          Backlight Timeout
          <select id="backlight-timeout">
            <option value="Always" ${document.settings.backlightTimeoutSec === "Always" ? "selected" : ""}>Always</option>
            <option value="5" ${document.settings.backlightTimeoutSec === "5" ? "selected" : ""}>5</option>
            <option value="10" ${document.settings.backlightTimeoutSec === "10" ? "selected" : ""}>10</option>
            <option value="15" ${document.settings.backlightTimeoutSec === "15" ? "selected" : ""}>15</option>
          </select>
        </label>
        <label>
          Keypad Auto Lock
          <select id="keypad-auto-lock">
            <option value="Manual" ${document.settings.keypadAutoLockSec === "Manual" ? "selected" : ""}>Manual</option>
            <option value="5" ${document.settings.keypadAutoLockSec === "5" ? "selected" : ""}>5</option>
            <option value="10" ${document.settings.keypadAutoLockSec === "10" ? "selected" : ""}>10</option>
            <option value="15" ${document.settings.keypadAutoLockSec === "15" ? "selected" : ""}>15</option>
          </select>
        </label>
        <label>
          Alert Tones
          <select id="alert-tones">
            <option value="On" ${document.settings.alertTones === "On" ? "selected" : ""}>On</option>
            <option value="Off" ${document.settings.alertTones === "Off" ? "selected" : ""}>Off</option>
          </select>
        </label>
        <label>
          Time Zone
          <select id="time-zone">
            ${TIME_ZONE_OPTIONS.map((zone) => `<option value="${zone}" ${document.settings.timeZone === zone ? "selected" : ""}>${zone}</option>`).join("")}
          </select>
        </label>
        </section>
      </div>
    `;
  }

  if (activeTab === "digital-contacts") {
    return `
      <h2>Digital Contacts</h2>
      <button class="button tiny" id="add-contact">Add Contact</button>
      <div class="rows">
        ${document.contacts
          .map(
            (contact) => `
              <div class="row">
                <input data-contact-name="${contact.id}" value="${escapeHtml(contact.name)}" maxlength="16" />
                <input data-contact-call-id="${contact.id}" type="number" min="1" max="16777215" value="${contact.callId}" />
                <button class="button ghost tiny" data-contact-delete="${contact.id}">Delete</button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "menus") {
    const rows: Array<{ key: keyof typeof document.menuSettings; label: string }> = [
      { key: "radioDisable", label: "Radio Disable" },
      { key: "radioEnable", label: "Radio Enable" },
      { key: "remoteMonitor", label: "Remote Monitor" },
      { key: "radioCheck", label: "Radio Check" },
      { key: "manualDial", label: "Manual Dial" },
      { key: "edit", label: "Edit" },
      { key: "callAlert", label: "Call Alert" },
      { key: "textMessage", label: "Text Message" },
      { key: "toneOrAlert", label: "Tone Or Alert" },
      { key: "talkaround", label: "Talkaround" },
      { key: "outgoingRadio", label: "Outgoing Radio" },
      { key: "answered", label: "Answered" },
      { key: "missed", label: "Missed" },
      { key: "editList", label: "Edit List" },
      { key: "scan", label: "Scan" },
      { key: "programKey", label: "Program Key" },
      { key: "vox", label: "VOX" },
      { key: "squelch", label: "Squelch" },
      { key: "ledIndicator", label: "LED Indicator" },
      { key: "keyboardLock", label: "Keyboard Lock" },
      { key: "introScreen", label: "Intro Screen" },
      { key: "backlight", label: "Backlight" },
      { key: "power", label: "Power" },
      { key: "gps", label: "GPS" },
      { key: "programRadio", label: "Program Radio" },
      { key: "displayMode", label: "Display Mode" },
      { key: "passwordAndLock", label: "Password And Lock" },
    ];
    return `
      <h2>Menus</h2>
      <label>
        Hang Time
        <select id="menu-hang-time">
          <option value="Hang" ${document.menuSettings.hangTime === "Hang" ? "selected" : ""}>Hang</option>
          ${Array.from({ length: 31 }, (_, i) => `<option value="${i}" ${document.menuSettings.hangTime === `${i}` ? "selected" : ""}>${i}</option>`).join("")}
        </select>
      </label>
      <div class="disabled-grid">
        ${rows
          .map(
            (row) => `
              <label>
                ${row.label}
                <select data-menu-toggle="${row.key}">
                  <option value="On" ${document.menuSettings[row.key] === "On" ? "selected" : ""}>On</option>
                  <option value="Off" ${document.menuSettings[row.key] === "Off" ? "selected" : ""}>Off</option>
                </select>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "buttons") {
    const options = radioButtonActionOptions();
    return `
      <h2>Buttons</h2>
      <label>
        Long Press Duration (ms)
        <input id="long-press-duration" type="number" min="1000" max="3750" step="250" value="${document.longPressDurationMs}" />
      </label>
      <div class="rows">
        ${document.radioButtons
          .map(
            (item) => `
              <label>
                ${escapeHtml(item.name)}
                <select data-radio-button="${item.id}">
                  ${options
                    .map(
                      (option) =>
                        `<option value="${option.code}" ${item.actionCode === option.code ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "digital-text") {
    return `
      <h2>Digital Text Message</h2>
      <button class="button tiny" id="add-text-message" ${document.textMessages.length >= 50 ? "disabled" : ""}>Add Message</button>
      <div class="rows memories-rows">
        ${document.textMessages
          .map(
            (item) => `
              <div class="row zone-row">
                <input value="${item.slot ?? item.id}" disabled />
                <input data-text-message="${item.id}" value="${escapeHtml(item.text)}" maxlength="144" />
                <button class="button ghost tiny" data-text-message-delete="${item.id}">Delete</button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "encryption") {
    return `
      <h2>Encryption</h2>
      <p class="muted-text">Privacy keys from the codeplug library layout.</p>
      <h3>Enhanced Keys (32 hex chars each)</h3>
      <div class="rows">
        ${document.privacySettings.enhancedKeys
          .map(
            (key, index) => `
              <label>
                Enhanced ${index + 1}
                <input data-enhanced-key="${index}" value="${escapeHtml(key)}" maxlength="32" />
              </label>
            `,
          )
          .join("")}
      </div>
      <h3>Basic Keys (4 hex chars each)</h3>
      <div class="rows">
        ${document.privacySettings.basicKeys
          .map(
            (key, index) => `
              <label>
                Basic ${index + 1}
                <input data-basic-key="${index}" value="${escapeHtml(key)}" maxlength="4" />
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "radio-transfer") {
    const capabilities = detectBrowserRadioCapabilities();
    const isConnected = uiState.radioTransport?.isConnected() ?? false;
    const connectLabel = isConnected ? "Disconnect Device" : "Connect Device";
    const readEnabled = isConnected && !uiState.radioBusy;
    const writeEnabled = isConnected && !uiState.radioBusy;

    const isWindows = /Windows/i.test(capabilities.userAgent);
    const isLinux = /Linux/i.test(capabilities.userAgent);
    const isMac = /Mac OS|Macintosh/i.test(capabilities.userAgent);

    let driverRequirements = "";
    if (isWindows) {
      driverRequirements = `
        <section class="radio-transfer-card">
          <h3>Windows Driver Setup (Required)</h3>
          <p>WebUSB requires <strong>WinUSB</strong> specifically. LibUSB and LibUsbK do <em>not</em> work with browser WebUSB.</p>
          <ol class="radio-transfer-list">
            <li>Download and run <a href="https://zadig.akeo.ie" target="_blank" rel="noopener">Zadig</a>.</li>
            <li>Put your radio in programming mode (power on while holding PTT + upper side button).</li>
            <li>In Zadig: Options → List All Devices.</li>
            <li>Select your radio (look for "STM32 BOOTLOADER" or similar) from the dropdown.</li>
            <li>Set the target driver to <strong>WinUSB</strong> (use the arrows if another driver is shown).</li>
            <li>Click "Replace Driver" (even if LibUSB or LibUsbK is currently installed).</li>
            <li>Unplug and replug the radio after the driver change.</li>
          </ol>
          <p class="muted-text">If "USB permission denied" errors persist, ensure no other software (like the official CPS) is using the device.</p>
        </section>`;
    } else if (isLinux) {
      driverRequirements = `
        <section class="radio-transfer-card">
          <h3>Linux Setup</h3>
          <p>Ensure udev rules are installed for non-root USB access:</p>
          <pre class="code-block">sudo cp tools/99-md380.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger</pre>
          <p class="muted-text">Your user should also be in the <code>plugdev</code> group.</p>
        </section>`;
    } else if (isMac) {
      driverRequirements = `
        <section class="radio-transfer-card">
          <h3>macOS Setup</h3>
          <p>macOS typically works without additional driver setup. If you encounter issues, ensure no other application is using the radio's USB interface.</p>
        </section>`;
    }

    return `
      <h2>Radio Transfer</h2>
      <p class="muted-text">Browser-native radio read/write using WebUSB.</p>

      <div class="radio-transfer-grid">
        <section class="radio-transfer-card">
          <h3>Environment Compatibility</h3>
          <ul class="radio-transfer-list">
            <li>Secure Context: <strong>${capabilities.isSecureContext ? "Yes" : "No"}</strong></li>
            <li>WebUSB API: <strong>${capabilities.hasNavigatorUsb && capabilities.hasRequestDevice ? "Available" : "Unavailable"}</strong></li>
            <li>Browser: <strong>${escapeHtml(capabilities.userAgent)}</strong></li>
          </ul>
          ${
            capabilities.blockers.length > 0
              ? `<div class="radio-transfer-blocker">${capabilities.blockers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
              : `<p class="ok">This browser environment appears compatible with the upcoming WebUSB flow.</p>`
          }
          ${
            capabilities.warnings.length > 0
              ? `<div class="radio-transfer-warning">${capabilities.warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
              : ""
          }
        </section>

        ${driverRequirements}

        <section class="radio-transfer-card">
          <h3>Browser Workflow</h3>
          <ol class="radio-transfer-list">
            <li>Connect radio over USB and grant browser permission.</li>
            <li>Read codeplug directly into the editor.</li>
            <li>Edit and validate in-browser.</li>
            <li>Write codeplug back with explicit confirmation and backup options.</li>
          </ol>
          <p class="muted-text" id="radio-transfer-status">Status: ${escapeHtml(uiState.radioStatusMessage)}</p>
          <div id="radio-transfer-progress-wrap" class="radio-transfer-progress ${uiState.radioProgressVisible ? "" : "hidden"}">
            <progress id="radio-transfer-progress" max="100" value="${uiState.radioProgressPercent}"></progress>
            <p class="muted-text" id="radio-transfer-progress-label">${escapeHtml(uiState.radioProgressLabel)}</p>
          </div>
          <div class="actions">
            <button id="radio-transfer-connect" class="button ghost" ${(capabilities.supported && !uiState.radioBusy) || isConnected ? "" : "disabled"}>${connectLabel}</button>
            <button id="radio-transfer-read" class="button ghost" ${readEnabled ? "" : "disabled"}>Read From Radio</button>
            <button id="radio-transfer-write" class="button ghost" ${writeEnabled ? "" : "disabled"}>Write To Radio</button>
          </div>
          <p class="muted-text">If your browser blocks WebUSB, use the local helper fallback flow.</p>
        </section>
      </div>
    `;
  }

  if (activeTab === "zones") {
    const selectedZone = uiState.selectedZoneId ? document.zones.find((z) => z.id === uiState.selectedZoneId) : null;
    return `
      <h2>Zones</h2>
      <div class="two-pane-layout">
        <div class="pane-left">
          <button class="button tiny" id="add-zone">Add Zone</button>
          <div class="list">
            ${document.zones
              .map(
                (zone) => `
                  <div class="list-item ${zone.id === uiState.selectedZoneId ? "selected" : ""}" data-zone-select="${zone.id}">
                    <div class="list-item-name">${escapeHtml(zone.name)}</div>
                    <div class="list-item-meta">${zone.channelIds.length} channels</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="pane-right">
          ${
            selectedZone
              ? `
            <div class="form-group">
              <label>
                Zone Name
                <input id="zone-editor-name" type="text" value="${escapeHtml(selectedZone.name)}" maxlength="16" />
              </label>
            </div>

            <div class="zone-editor-meta">
              <strong>${selectedZone.channelIds.length}/16 channels selected</strong>
              <small class="muted-text">Pick channels on the left, then reorder on the right.</small>
              <small id="zone-editor-error" class="field-error"></small>
            </div>

            <div class="zone-editor-grid">
              <section class="zone-editor-panel">
                <h3>Available Channels</h3>
                <div class="zone-channel-pool">
                  ${document.channels.length === 0
                    ? `<p class="muted-text">No channels available.</p>`
                    : document.channels
                        .map(
                          (channel) => `
                            <label class="zone-channel-toggle">
                              <input
                                type="checkbox"
                                data-zone-channel-toggle="${channel.id}"
                                ${selectedZone.channelIds.includes(channel.id) ? "checked" : ""}
                              />
                              <span>#${channel.id} ${escapeHtml(channel.name)}</span>
                            </label>
                          `,
                        )
                        .join("")}
                </div>
              </section>

              <section class="zone-editor-panel">
                <h3>Selected Channel Order</h3>
                <div id="zone-selected-channels" class="zone-selected-list">
                  ${selectedZone.channelIds.length === 0
                    ? `<p class="muted-text">No channels selected.</p>`
                    : selectedZone.channelIds
                        .map((channelId, index) => {
                          const channel = document.channels.find((item) => item.id === channelId);
                          return `
                            <div class="zone-selected-row" data-zone-selected-row="${channelId}">
                              <span class="zone-selected-name">${index + 1}. #${channelId} ${escapeHtml(channel?.name ?? "Unknown")}</span>
                              <div class="zone-selected-actions">
                                <button class="button ghost tiny zone-order-button" title="Move channel up" aria-label="Move channel up" data-zone-channel-up="${channelId}" ${index === 0 ? "disabled" : ""}>&uarr;</button>
                                <button class="button ghost tiny zone-order-button" title="Move channel down" aria-label="Move channel down" data-zone-channel-down="${channelId}" ${index === selectedZone.channelIds.length - 1 ? "disabled" : ""}>&darr;</button>
                                <button class="button ghost tiny" data-zone-channel-remove="${channelId}">Remove</button>
                              </div>
                            </div>
                          `;
                        })
                        .join("")}
                </div>
              </section>
            </div>

            <div class="form-actions">
              <button class="button tiny" id="zone-editor-delete">Delete Zone</button>
            </div>
          `
              : `<p class="muted-text">Select a zone to edit</p>`
          }
        </div>
      </div>
    `;
  }


  if (activeTab === "scan-lists") {
    return `
      <h2>Scan Lists</h2>
      <p class="muted-text">Read-only right now. Editing support for scan lists is planned.</p>
      <div class="rows">
        ${document.scanLists.length === 0
          ? `<p class="muted-text">No scan lists found in this codeplug.</p>`
          : document.scanLists
              .map(
                (scanList) => `
                  <div class="row zone-row readonly-row">
                    <input value="${scanList.id}" disabled />
                    <input value="${escapeHtml(scanList.name)}" disabled />
                    <input value="Read-only" disabled />
                  </div>
                `,
              )
              .join("")}
      </div>
    `;
  }

  if (activeTab === "group-lists") {
    return `
      <h2>Group Lists</h2>
      <p class="muted-text">Read-only right now. Editing support for group lists is planned.</p>
      <div class="rows">
        ${document.groupLists.length === 0
          ? `<p class="muted-text">No group lists found in this codeplug.</p>`
          : document.groupLists
              .map(
                (groupList) => `
                  <div class="row zone-row readonly-row">
                    <input value="${groupList.id}" disabled />
                    <input value="${escapeHtml(groupList.name)}" disabled />
                    <input value="Read-only" disabled />
                  </div>
                `,
              )
              .join("")}
      </div>
    `;
  }

  if (activeTab === "channels") {
    const filteredChannels = document.channels.filter((channel) => {
      const nameHit = channel.name.toLowerCase().includes(channelState.query.toLowerCase());
      const modeHit = channelState.modeFilter === "all" || channel.channelMode === channelState.modeFilter;
      return nameHit && modeHit;
    });

    const selectedChannel = uiState.selectedChannelId ? document.channels.find((c) => c.id === uiState.selectedChannelId) : null;

    return `
      <h2>Channels</h2>
      <div class="two-pane-layout">
        <div class="pane-left">
          <div class="toolbar">
            <button class="button tiny" id="add-channel">Add Channel</button>
            <input id="channel-search" placeholder="Search" value="${escapeHtml(channelState.query)}" />
            <select id="channel-mode-filter">
              <option value="all" ${channelState.modeFilter === "all" ? "selected" : ""}>All Modes</option>
              <option value="Analog" ${channelState.modeFilter === "Analog" ? "selected" : ""}>Analog</option>
              <option value="Digital" ${channelState.modeFilter === "Digital" ? "selected" : ""}>Digital</option>
            </select>
          </div>
          <div class="list">
            ${filteredChannels
              .map(
                (channel) => `
                  <div class="list-item ${channel.id === uiState.selectedChannelId ? "selected" : ""}" data-channel-select="${channel.id}">
                    <div class="list-item-name">${escapeHtml(channel.name)}</div>
                    <div class="list-item-meta">${channel.rxFrequencyMHz.toFixed(4)} MHz (${channel.channelMode})</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="pane-right">
          ${
            selectedChannel
              ? `
            <div class="form-group">
              <label>
                Channel Name
                <input id="channel-editor-name" type="text" value="${escapeHtml(selectedChannel.name)}" maxlength="16" />
              </label>
            </div>
            <div class="form-group">
              <label>
                RX Frequency (MHz)
                <input id="channel-editor-rx" type="number" step="0.00001" min="100" max="1000" value="${selectedChannel.rxFrequencyMHz.toFixed(5)}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                TX Frequency (MHz)
                <input id="channel-editor-tx" type="number" step="0.00001" min="100" max="1000" value="${selectedChannel.txFrequencyMHz.toFixed(5)}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                TX Offset (MHz)
                <input id="channel-editor-tx-offset" type="number" step="0.00001" min="-100" max="100" value="${selectedChannel.txOffsetMHz.toFixed(5)}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                Mode
                <select id="channel-editor-mode">
                  <option value="Analog" ${selectedChannel.channelMode === "Analog" ? "selected" : ""}>Analog</option>
                  <option value="Digital" ${selectedChannel.channelMode === "Digital" ? "selected" : ""}>Digital</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Color Code
                <input id="channel-editor-color-code" type="number" min="0" max="15" step="1" value="${selectedChannel.colorCode}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                Time Slot
                <select id="channel-editor-slot">
                  <option value="1" ${selectedChannel.repeaterSlot === 1 ? "selected" : ""}>TS1</option>
                  <option value="2" ${selectedChannel.repeaterSlot === 2 ? "selected" : ""}>TS2</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Bandwidth (kHz)
                <select id="channel-editor-bandwidth">
                  <option value="12.5" ${selectedChannel.bandwidthKhz === "12.5" ? "selected" : ""}>12.5</option>
                  <option value="20" ${selectedChannel.bandwidthKhz === "20" ? "selected" : ""}>20</option>
                  <option value="25" ${selectedChannel.bandwidthKhz === "25" ? "selected" : ""}>25</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Power
                <select id="channel-editor-power">
                  <option value="Low" ${selectedChannel.power === "Low" ? "selected" : ""}>Low</option>
                  <option value="High" ${selectedChannel.power === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Contact
                <select id="channel-editor-contact-id">
                  <option value="">No Contact</option>
                  ${document.contacts
                    .map(
                      (contact) =>
                        `<option value="${contact.id}" ${selectedChannel.contactId === contact.id ? "selected" : ""}>${escapeHtml(contact.name)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Scan List
                <select id="channel-editor-scan-list-id">
                  <option value="">None</option>
                  ${document.scanLists
                    .map(
                      (scanList) =>
                        `<option value="${scanList.id}" ${selectedChannel.scanListId === scanList.id ? "selected" : ""}>${escapeHtml(scanList.name)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                RX Group List
                <select id="channel-editor-group-list-id">
                  <option value="">None</option>
                  ${document.groupLists
                    .map(
                      (groupList) =>
                        `<option value="${groupList.id}" ${selectedChannel.groupListId === groupList.id ? "selected" : ""}>${escapeHtml(groupList.name)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Admit Criteria
                <select id="channel-editor-admit-criteria">
                  <option value="Always" ${selectedChannel.admitCriteria === "Always" ? "selected" : ""}>Always</option>
                  <option value="Channel free" ${selectedChannel.admitCriteria === "Channel free" ? "selected" : ""}>Channel free</option>
                  <option value="CTCSS/DCS" ${selectedChannel.admitCriteria === "CTCSS/DCS" ? "selected" : ""}>CTCSS/DCS</option>
                  <option value="Color code" ${selectedChannel.admitCriteria === "Color code" ? "selected" : ""}>Color code</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                In-Call Criteria
                <select id="channel-editor-in-call-criteria">
                  <option value="Always" ${selectedChannel.inCallCriteria === "Always" ? "selected" : ""}>Always</option>
                  <option value="Follow Admit Criteria" ${selectedChannel.inCallCriteria === "Follow Admit Criteria" ? "selected" : ""}>Follow Admit Criteria</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Privacy
                <select id="channel-editor-privacy">
                  <option value="None" ${selectedChannel.privacy === "None" ? "selected" : ""}>None</option>
                  <option value="Basic" ${selectedChannel.privacy === "Basic" ? "selected" : ""}>Basic</option>
                  <option value="Enhanced" ${selectedChannel.privacy === "Enhanced" ? "selected" : ""}>Enhanced</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Privacy Number
                <input id="channel-editor-privacy-number" type="number" min="1" max="16" step="1" value="${selectedChannel.privacyNumber}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                TOT (s)
                <select id="channel-editor-tot">
                  <option value="Infinite" ${selectedChannel.totSec === "Infinite" ? "selected" : ""}>Infinite</option>
                  ${Array.from({ length: 37 }, (_, i) => i + 1)
                    .map((value) => {
                      const sec = value * 15;
                      return `<option value="${sec}" ${selectedChannel.totSec === sec ? "selected" : ""}>${sec}</option>`;
                    })
                    .join("")}
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                TOT Rekey Delay (s)
                <input id="channel-editor-tot-rekey" type="number" min="0" max="255" step="1" value="${selectedChannel.totRekeyDelaySec}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                Emergency System
                <input id="channel-editor-emergency-system" type="number" min="0" max="32" step="1" value="${selectedChannel.emergencySystem}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                RX Ref Frequency
                <select id="channel-editor-rx-ref-frequency">
                  <option value="Low" ${selectedChannel.rxRefFrequency === "Low" ? "selected" : ""}>Low</option>
                  <option value="Medium" ${selectedChannel.rxRefFrequency === "Medium" ? "selected" : ""}>Medium</option>
                  <option value="High" ${selectedChannel.rxRefFrequency === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                TX Ref Frequency
                <select id="channel-editor-tx-ref-frequency">
                  <option value="Low" ${selectedChannel.txRefFrequency === "Low" ? "selected" : ""}>Low</option>
                  <option value="Medium" ${selectedChannel.txRefFrequency === "Medium" ? "selected" : ""}>Medium</option>
                  <option value="High" ${selectedChannel.txRefFrequency === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                RX Signalling
                <select id="channel-editor-rx-signalling">
                  <option value="Off" ${selectedChannel.rxSignallingSystem === "Off" ? "selected" : ""}>Off</option>
                  <option value="DTMF-1" ${selectedChannel.rxSignallingSystem === "DTMF-1" ? "selected" : ""}>DTMF-1</option>
                  <option value="DTMF-2" ${selectedChannel.rxSignallingSystem === "DTMF-2" ? "selected" : ""}>DTMF-2</option>
                  <option value="DTMF-3" ${selectedChannel.rxSignallingSystem === "DTMF-3" ? "selected" : ""}>DTMF-3</option>
                  <option value="DTMF-4" ${selectedChannel.rxSignallingSystem === "DTMF-4" ? "selected" : ""}>DTMF-4</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                TX Signalling
                <select id="channel-editor-tx-signalling">
                  <option value="Off" ${selectedChannel.txSignallingSystem === "Off" ? "selected" : ""}>Off</option>
                  <option value="DTMF-1" ${selectedChannel.txSignallingSystem === "DTMF-1" ? "selected" : ""}>DTMF-1</option>
                  <option value="DTMF-2" ${selectedChannel.txSignallingSystem === "DTMF-2" ? "selected" : ""}>DTMF-2</option>
                  <option value="DTMF-3" ${selectedChannel.txSignallingSystem === "DTMF-3" ? "selected" : ""}>DTMF-3</option>
                  <option value="DTMF-4" ${selectedChannel.txSignallingSystem === "DTMF-4" ? "selected" : ""}>DTMF-4</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                CTCSS/DCS Decode
                <input id="channel-editor-ctcss-decode" type="text" value="${escapeHtml(selectedChannel.ctcssDecode)}" placeholder="None / 67.0 / D023N" />
              </label>
            </div>
            <div class="form-group">
              <label>
                CTCSS/DCS Encode
                <input id="channel-editor-ctcss-encode" type="text" value="${escapeHtml(selectedChannel.ctcssEncode)}" placeholder="None / 67.0 / D023N" />
              </label>
            </div>
            <div class="form-group">
              <label>
                QT Reverse
                <select id="channel-editor-qt-reverse">
                  <option value="180" ${selectedChannel.qtReverse === "180" ? "selected" : ""}>180</option>
                  <option value="120" ${selectedChannel.qtReverse === "120" ? "selected" : ""}>120</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                Non-QT/DQT Turn-off Freq
                <select id="channel-editor-dqt-turnoff">
                  <option value="None" ${selectedChannel.nonQtDqtTurnoffFreq === "None" ? "selected" : ""}>None</option>
                  <option value="Raw-1" ${selectedChannel.nonQtDqtTurnoffFreq === "Raw-1" ? "selected" : ""}>Unknown (raw 1)</option>
                  <option value="259.2 Hz" ${selectedChannel.nonQtDqtTurnoffFreq === "259.2 Hz" ? "selected" : ""}>259.2 Hz</option>
                  <option value="55.2 Hz" ${selectedChannel.nonQtDqtTurnoffFreq === "55.2 Hz" ? "selected" : ""}>55.2 Hz</option>
                </select>
              </label>
            </div>
            <div class="disabled-grid">
              <label>RX Only<select id="channel-editor-rx-only"><option value="Off" ${selectedChannel.rxOnly === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.rxOnly === "On" ? "selected" : ""}>On</option></select></label>
              <label>Autoscan<select id="channel-editor-autoscan"><option value="Off" ${selectedChannel.autoscan === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.autoscan === "On" ? "selected" : ""}>On</option></select></label>
              <label>Lone Worker<select id="channel-editor-lone-worker"><option value="Off" ${selectedChannel.loneWorker === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.loneWorker === "On" ? "selected" : ""}>On</option></select></label>
              <label>VOX<select id="channel-editor-vox"><option value="Off" ${selectedChannel.vox === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.vox === "On" ? "selected" : ""}>On</option></select></label>
              <label>Allow Talkaround<select id="channel-editor-allow-talkaround"><option value="Off" ${selectedChannel.allowTalkaround === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.allowTalkaround === "On" ? "selected" : ""}>On</option></select></label>
              <label>Talkaround<select id="channel-editor-talkaround"><option value="Off" ${selectedChannel.talkaround === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.talkaround === "On" ? "selected" : ""}>On</option></select></label>
              <label>Private Call Confirmed<select id="channel-editor-private-confirmed"><option value="Off" ${selectedChannel.privateCallConfirmed === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.privateCallConfirmed === "On" ? "selected" : ""}>On</option></select></label>
              <label>Data Call Confirmed<select id="channel-editor-data-confirmed"><option value="Off" ${selectedChannel.dataCallConfirmed === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.dataCallConfirmed === "On" ? "selected" : ""}>On</option></select></label>
              <label>Emergency Alarm Ack<select id="channel-editor-emergency-ack"><option value="Off" ${selectedChannel.emergencyAlarmAck === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.emergencyAlarmAck === "On" ? "selected" : ""}>On</option></select></label>
              <label>Compressed UDP Header<select id="channel-editor-compressed-udp"><option value="Off" ${selectedChannel.compressedUdpDataHeader === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.compressedUdpDataHeader === "On" ? "selected" : ""}>On</option></select></label>
              <label>Display PTT ID<select id="channel-editor-display-ptt"><option value="Off" ${selectedChannel.displayPttId === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.displayPttId === "On" ? "selected" : ""}>On</option></select></label>
              <label>Receive GPS Info<select id="channel-editor-receive-gps"><option value="Off" ${selectedChannel.receiveGpsInfo === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.receiveGpsInfo === "On" ? "selected" : ""}>On</option></select></label>
              <label>Send GPS Info<select id="channel-editor-send-gps"><option value="Off" ${selectedChannel.sendGpsInfo === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.sendGpsInfo === "On" ? "selected" : ""}>On</option></select></label>
              <label>Reverse Burst<select id="channel-editor-reverse-burst"><option value="Off" ${selectedChannel.reverseBurst === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.reverseBurst === "On" ? "selected" : ""}>On</option></select></label>
              <label>DCDM Switch<select id="channel-editor-dcdm"><option value="Off" ${selectedChannel.dcdmSwitch === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.dcdmSwitch === "On" ? "selected" : ""}>On</option></select></label>
              <label>Leader/MS<select id="channel-editor-leader-ms"><option value="Off" ${selectedChannel.leaderMs === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.leaderMs === "On" ? "selected" : ""}>On</option></select></label>
              <label>Allow Interrupt<select id="channel-editor-allow-interrupt"><option value="Off" ${selectedChannel.allowInterrupt === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.allowInterrupt === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 1<select id="channel-editor-decode1"><option value="Off" ${selectedChannel.decode1 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode1 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 2<select id="channel-editor-decode2"><option value="Off" ${selectedChannel.decode2 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode2 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 3<select id="channel-editor-decode3"><option value="Off" ${selectedChannel.decode3 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode3 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 4<select id="channel-editor-decode4"><option value="Off" ${selectedChannel.decode4 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode4 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 5<select id="channel-editor-decode5"><option value="Off" ${selectedChannel.decode5 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode5 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 6<select id="channel-editor-decode6"><option value="Off" ${selectedChannel.decode6 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode6 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 7<select id="channel-editor-decode7"><option value="Off" ${selectedChannel.decode7 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode7 === "On" ? "selected" : ""}>On</option></select></label>
              <label>Decode 8<select id="channel-editor-decode8"><option value="Off" ${selectedChannel.decode8 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode8 === "On" ? "selected" : ""}>On</option></select></label>
            </div>
            <div class="form-actions">
              <button class="button tiny" id="channel-editor-delete">Delete Channel</button>
            </div>
            <div class="bulkbar">
              <strong>Bulk Update (${filteredChannels.length})</strong>
              <select id="bulk-mode">
                <option value="">Mode (unchanged)</option>
                <option value="Analog">Analog</option>
                <option value="Digital">Digital</option>
              </select>
              <select id="bulk-power">
                <option value="">Power (unchanged)</option>
                <option value="Low">Low</option>
                <option value="High">High</option>
              </select>
              <button class="button tiny" id="apply-bulk">Apply To Filtered</button>
            </div>
          `
              : `<p class="muted-text">Select a channel to edit</p>`
          }
        </div>
      </div>
    `;
  }

  return `<p class="muted-text">Tab is not available in this build.</p>`;
}

function bindFileInputs(target: HTMLElement, store: EditorStore): void {
  for (const input of target.querySelectorAll<HTMLInputElement>("#file-input")) {
    input.addEventListener("change", async (event) => {
      const element = event.currentTarget as HTMLInputElement;
      const [file] = element.files ?? [];
      if (!file) {
        return;
      }
      const arrayBuffer = await file.arrayBuffer();
      store.load(file.name, new Uint8Array(arrayBuffer));
    });
  }
}

function bindTopActions(target: HTMLElement, store: EditorStore, state: AppState): void {
  target.querySelector<HTMLButtonElement>("#export-btn")?.addEventListener("click", () => {
    const snapshot = store.getState();
    if (!snapshot.document) {
      return;
    }
    const bytes = store.exportBytes();
    if (!bytes) {
      return;
    }
    downloadBytes(snapshot.document.outputFileName, bytes);
  });

  target.querySelector<HTMLButtonElement>("#undo-btn")?.addEventListener("click", () => {
    if (state.undoCount > 0) {
      store.undo();
    }
  });

  target.querySelector<HTMLButtonElement>("#redo-btn")?.addEventListener("click", () => {
    if (state.redoCount > 0) {
      store.redo();
    }
  });
}

function bindTabs(
  target: HTMLElement,
  uiState: UiState,
  state: AppState,
  store: EditorStore,
  channelState: ChannelPanelState,
): void {
  for (const tabButton of target.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    tabButton.addEventListener("click", () => {
      const key = tabButton.dataset.tab;
      if (
        key === "basic" ||
        key === "general" ||
        key === "menus" ||
        key === "buttons" ||
        key === "digital-text" ||
        key === "encryption" ||
        key === "digital-contacts" ||
        key === "zones" ||
        key === "group-lists" ||
        key === "scan-lists" ||
        key === "channels" ||
        key === "radio-transfer"
      ) {
        uiState.activeTab = key;
        renderState(target, store, state, channelState, uiState);
      }
    });
  }
}

function bindActiveTab(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
): void {
  if (!state.document) {
    return;
  }

  if (uiState.activeTab === "general") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    const radioNameInput = panel?.querySelector<HTMLInputElement>("#radio-name");
    const radioIdInput = panel?.querySelector<HTMLInputElement>("#radio-id");
    const voxSensitivityInput = panel?.querySelector<HTMLInputElement>("#vox-sensitivity");
    const txPreambleDurationInput = panel?.querySelector<HTMLInputElement>("#tx-preamble-duration");
    const rxLowBatteryIntervalInput = panel?.querySelector<HTMLInputElement>("#rx-low-battery-interval");
    const backlightTimeoutSelect = panel?.querySelector<HTMLSelectElement>("#backlight-timeout");
    const keypadAutoLockSelect = panel?.querySelector<HTMLSelectElement>("#keypad-auto-lock");
    const bootLine1Input = panel?.querySelector<HTMLInputElement>("#boot-line-1");
    const bootLine2Input = panel?.querySelector<HTMLInputElement>("#boot-line-2");
    const alertTonesSelect = panel?.querySelector<HTMLSelectElement>("#alert-tones");
    const timeZoneSelect = panel?.querySelector<HTMLSelectElement>("#time-zone");

    const radioNameError = panel?.querySelector<HTMLElement>("#radio-name-error");
    const radioIdError = panel?.querySelector<HTMLElement>("#radio-id-error");
    const voxError = panel?.querySelector<HTMLElement>("#vox-sensitivity-error");
    const preambleError = panel?.querySelector<HTMLElement>("#tx-preamble-duration-error");
    const lowBatteryError = panel?.querySelector<HTMLElement>("#rx-low-battery-interval-error");
    const bootLine1Error = panel?.querySelector<HTMLElement>("#boot-line-1-error");
    const bootLine2Error = panel?.querySelector<HTMLElement>("#boot-line-2-error");

    const setFieldError = (input: HTMLInputElement | null | undefined, error: HTMLElement | null | undefined, message: string): void => {
      if (!input || !error) {
        return;
      }
      error.textContent = message;
      input.classList.toggle("input-invalid", message.length > 0);
    };

    const validate = (): boolean => {
      if (!radioNameInput || !radioIdInput || !voxSensitivityInput || !txPreambleDurationInput || !rxLowBatteryIntervalInput || !bootLine1Input || !bootLine2Input) {
        return false;
      }

      const radioName = radioNameInput.value.trim();
      const radioId = Number.parseInt(radioIdInput.value, 10);
      const vox = Number.parseInt(voxSensitivityInput.value, 10);
      const preamble = Number.parseInt(txPreambleDurationInput.value, 10);
      const lowBattery = Number.parseInt(rxLowBatteryIntervalInput.value, 10);

      setFieldError(radioNameInput, radioNameError, radioName.length === 0 ? "Radio name is required." : "");
      setFieldError(radioIdInput, radioIdError, Number.isNaN(radioId) || radioId < 1 || radioId > 16777215 ? "DMR ID must be between 1 and 16,777,215." : "");
      setFieldError(voxSensitivityInput, voxError, Number.isNaN(vox) || vox < 1 || vox > 10 ? "VOX sensitivity must be between 1 and 10." : "");
      setFieldError(txPreambleDurationInput, preambleError, Number.isNaN(preamble) || preamble < 0 || preamble > 8640 || preamble % 60 !== 0 ? "Preamble must be 0-8640 ms in 60 ms increments." : "");
      setFieldError(rxLowBatteryIntervalInput, lowBatteryError, Number.isNaN(lowBattery) || lowBattery < 0 || lowBattery > 635 || lowBattery % 5 !== 0 ? "Low battery interval must be 0-635 s in 5 s increments." : "");
      setFieldError(bootLine1Input, bootLine1Error, bootLine1Input.value.length > 10 ? "Line 1 must be 10 chars or fewer." : "");
      setFieldError(bootLine2Input, bootLine2Error, bootLine2Input.value.length > 10 ? "Line 2 must be 10 chars or fewer." : "");

      return panel.querySelector(".field-error:not(:empty)") === null;
    };

    const commit = (): void => {
      if (
        !radioNameInput ||
        !radioIdInput ||
        !voxSensitivityInput ||
        !txPreambleDurationInput ||
        !rxLowBatteryIntervalInput ||
        !backlightTimeoutSelect ||
        !keypadAutoLockSelect ||
        !bootLine1Input ||
        !bootLine2Input ||
        !alertTonesSelect ||
        !timeZoneSelect
      ) {
        return;
      }
      if (!validate()) {
        return;
      }
      const parsedId = Number.parseInt(radioIdInput.value, 10);
      const parsedVox = Number.parseInt(voxSensitivityInput.value, 10);
      const parsedPreamble = Number.parseInt(txPreambleDurationInput.value, 10);
      const parsedLowBattery = Number.parseInt(rxLowBatteryIntervalInput.value, 10);
      if (Number.isNaN(parsedId) || Number.isNaN(parsedVox) || Number.isNaN(parsedPreamble) || Number.isNaN(parsedLowBattery)) {
        return;
      }

      store.updateSettings({
        radioName: radioNameInput.value,
        radioId: parsedId,
        voxSensitivity: parsedVox,
        txPreambleDurationMs: parsedPreamble,
        rxLowBatteryIntervalSec: parsedLowBattery,
        backlightTimeoutSec:
          backlightTimeoutSelect.value === "5" ||
          backlightTimeoutSelect.value === "10" ||
          backlightTimeoutSelect.value === "15"
            ? backlightTimeoutSelect.value
            : "Always",
        keypadAutoLockSec:
          keypadAutoLockSelect.value === "5" ||
          keypadAutoLockSelect.value === "10" ||
          keypadAutoLockSelect.value === "15"
            ? keypadAutoLockSelect.value
            : "Manual",
        bootUpMessageLine1: bootLine1Input.value,
        bootUpMessageLine2: bootLine2Input.value,
        alertTones: alertTonesSelect.value === "Off" ? "Off" : "On",
        timeZone: timeZoneSelect.value,
      });
    };

    radioNameInput?.addEventListener("input", commit);
    radioIdInput?.addEventListener("input", commit);
    voxSensitivityInput?.addEventListener("input", commit);
    txPreambleDurationInput?.addEventListener("input", commit);
    rxLowBatteryIntervalInput?.addEventListener("input", commit);
    backlightTimeoutSelect?.addEventListener("change", commit);
    keypadAutoLockSelect?.addEventListener("change", commit);
    bootLine1Input?.addEventListener("input", commit);
    bootLine2Input?.addEventListener("input", commit);
    alertTonesSelect?.addEventListener("change", commit);
    timeZoneSelect?.addEventListener("change", commit);
    validate();
    return;
  }

  if (uiState.activeTab === "menus") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    const hangTime = panel.querySelector<HTMLSelectElement>("#menu-hang-time");
    const commitMenu = (): void => {
      if (!hangTime) {
        return;
      }
      store.updateMenuSettings({
        hangTime: hangTime.value,
      });
    };
    hangTime?.addEventListener("change", commitMenu);

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-menu-toggle]")) {
      select.addEventListener("change", () => {
        const key = select.dataset.menuToggle as keyof NonNullable<AppState["document"]>["menuSettings"];
        if (!key) {
          return;
        }
        store.updateMenuSettings({
          [key]: select.value === "Off" ? "Off" : "On",
        });
      });
    }
    return;
  }

  if (uiState.activeTab === "buttons") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    panel.querySelector<HTMLInputElement>("#long-press-duration")?.addEventListener("change", (event) => {
      const value = Number.parseInt((event.currentTarget as HTMLInputElement).value, 10);
      if (Number.isNaN(value)) {
        return;
      }
      store.updateLongPressDurationMs(value);
    });

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-radio-button]")) {
      select.addEventListener("change", () => {
        const id = Number.parseInt(select.dataset.radioButton ?? "", 10);
        const actionCode = Number.parseInt(select.value, 10);
        if (Number.isNaN(id) || Number.isNaN(actionCode)) {
          return;
        }
        store.updateRadioButtonAssignment(id, actionCode);
      });
    }
    return;
  }

  if (uiState.activeTab === "digital-text") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    panel.querySelector<HTMLButtonElement>("#add-text-message")?.addEventListener("click", () => {
      store.addTextMessage();
    });

    for (const input of panel.querySelectorAll<HTMLInputElement>("[data-text-message]")) {
      input.addEventListener("change", () => {
        const id = Number.parseInt(input.dataset.textMessage ?? "", 10);
        if (Number.isNaN(id)) {
          return;
        }
        store.updateTextMessage(id, input.value);
      });
    }

    for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-text-message-delete]")) {
      button.addEventListener("click", () => {
        const id = Number.parseInt(button.dataset.textMessageDelete ?? "", 10);
        if (Number.isNaN(id)) {
          return;
        }
        store.removeTextMessage(id);
      });
    }
    return;
  }

  if (uiState.activeTab === "encryption") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    for (const input of panel.querySelectorAll<HTMLInputElement>("[data-enhanced-key]")) {
      input.addEventListener("change", () => {
        const index = Number.parseInt(input.dataset.enhancedKey ?? "", 10);
        if (Number.isNaN(index)) {
          return;
        }
        const next = [...state.document.privacySettings.enhancedKeys];
        next[index] = input.value;
        store.updatePrivacySettings({ enhancedKeys: next });
      });
    }

    for (const input of panel.querySelectorAll<HTMLInputElement>("[data-basic-key]")) {
      input.addEventListener("change", () => {
        const index = Number.parseInt(input.dataset.basicKey ?? "", 10);
        if (Number.isNaN(index)) {
          return;
        }
        const next = [...state.document.privacySettings.basicKeys];
        next[index] = input.value;
        store.updatePrivacySettings({ basicKeys: next });
      });
    }
    return;
  }

  if (uiState.activeTab === "digital-contacts") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    panel.querySelector<HTMLButtonElement>("#add-contact")?.addEventListener("click", () => {
      store.addContact();
    });

    for (const nameInput of panel.querySelectorAll<HTMLInputElement>("[data-contact-name]")) {
      nameInput.addEventListener("change", () => {
        const id = Number.parseInt(nameInput.dataset.contactName ?? "", 10);
        const callIdInput = panel.querySelector<HTMLInputElement>(`[data-contact-call-id="${id}"]`);
        const callId = Number.parseInt(callIdInput?.value ?? "0", 10);
        if (!Number.isNaN(id) && !Number.isNaN(callId)) {
          store.updateContact(id, nameInput.value, callId);
        }
      });
    }

    for (const callIdInput of panel.querySelectorAll<HTMLInputElement>("[data-contact-call-id]")) {
      callIdInput.addEventListener("change", () => {
        const id = Number.parseInt(callIdInput.dataset.contactCallId ?? "", 10);
        const nameInput = panel.querySelector<HTMLInputElement>(`[data-contact-name="${id}"]`);
        const callId = Number.parseInt(callIdInput.value, 10);
        if (!Number.isNaN(id) && !Number.isNaN(callId)) {
          store.updateContact(id, nameInput?.value ?? `Contact ${id}`, callId);
        }
      });
    }

    for (const deleteButton of panel.querySelectorAll<HTMLButtonElement>("[data-contact-delete]")) {
      deleteButton.addEventListener("click", () => {
        const id = Number.parseInt(deleteButton.dataset.contactDelete ?? "", 10);
        if (!Number.isNaN(id)) {
          store.removeContact(id);
        }
      });
    }
    return;
  }

  if (uiState.activeTab === "radio-transfer") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    panel.querySelector<HTMLButtonElement>("#radio-transfer-connect")?.addEventListener("click", async () => {
      const capabilities = detectBrowserRadioCapabilities();
      const isConnected = uiState.radioTransport?.isConnected() ?? false;
      if (!isConnected && !capabilities.supported) {
        window.alert(`WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}`);
        return;
      }

      uiState.radioBusy = true;
      renderState(target, store, store.getState(), channelState, uiState);

      if (isConnected && uiState.radioTransport) {
        try {
          await uiState.radioTransport.disconnect();
          uiState.radioStatusMessage = "Disconnected.";
        } catch (error) {
          const message = error instanceof Error ? error.message : "Disconnect failed.";
          uiState.radioStatusMessage = `Disconnect failed: ${message}`;
        } finally {
          uiState.radioBusy = false;
          renderState(target, store, store.getState(), channelState, uiState);
        }
        return;
      }

      const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
      if (!transport) {
        uiState.radioBusy = false;
        uiState.radioStatusMessage = "Unable to initialize WebUSB transport in this browser.";
        renderState(target, store, store.getState(), channelState, uiState);
        window.alert("Unable to initialize WebUSB transport in this browser.");
        return;
      }

      try {
        uiState.radioTransport = transport;
        const device = await transport.connect();
        const label = [device.manufacturerName, device.productName].filter((item) => Boolean(item)).join(" ").trim();
        uiState.radioStatusMessage = `Connected: ${label || "USB radio"} (VID: 0x${device.vendorId.toString(16)}, PID: 0x${device.productId.toString(16)}).`;
        window.alert(
          `Connected to ${label || "USB radio"} (VID: 0x${device.vendorId.toString(16)}, PID: 0x${device.productId.toString(16)}).`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "WebUSB connection failed.";
        uiState.radioStatusMessage = `Connect failed: ${message}`;
        window.alert(`Connect failed: ${message}`);
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    panel.querySelector<HTMLButtonElement>("#radio-transfer-read")?.addEventListener("click", async () => {
      if (!uiState.radioTransport || !uiState.radioTransport.isConnected()) {
        window.alert("Connect a radio first.");
        return;
      }

      const applyProgress = (progress: BrowserTransferProgress): void => {
        setRadioProgress(uiState, progress);
        syncRadioProgressUi(target, uiState);
      };

      uiState.radioBusy = true;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "Starting radio read...";
      renderState(target, store, store.getState(), channelState, uiState);
      try {
        const bytes = await uiState.radioTransport.readCodeplug(applyProgress);
        store.load("radio-read.bin", bytes);
        const loadedState = store.getState();
        if (!loadedState.document) {
          throw new Error(loadedState.importError ?? "Read completed but codeplug parsing failed.");
        }
        uiState.radioStatusMessage = `Read complete: ${bytes.byteLength} bytes loaded into editor.`;
        uiState.radioProgressPercent = 100;
        uiState.radioProgressLabel = "Read complete.";
        window.alert(`Read complete: ${bytes.byteLength} bytes loaded into editor.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Read failed.";
        uiState.radioStatusMessage = `Read failed: ${message}`;
        uiState.radioProgressVisible = false;
        uiState.radioProgressPercent = 0;
        uiState.radioProgressLabel = "";
        window.alert(`Read failed: ${message}`);
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    panel.querySelector<HTMLButtonElement>("#radio-transfer-write")?.addEventListener("click", async () => {
      if (!uiState.radioTransport || !uiState.radioTransport.isConnected()) {
        window.alert("Connect a radio first.");
        return;
      }

      const bytes = store.exportBytes();
      if (!bytes) {
        window.alert("Nothing to write. Load or edit a codeplug first.");
        return;
      }

      const applyProgress = (progress: BrowserTransferProgress): void => {
        setRadioProgress(uiState, progress);
        syncRadioProgressUi(target, uiState);
      };

      uiState.radioBusy = true;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = "Starting radio write...";
      renderState(target, store, store.getState(), channelState, uiState);
      try {
        await uiState.radioTransport.writeCodeplug(bytes, applyProgress);
        uiState.radioStatusMessage = `Write complete: ${bytes.byteLength} bytes sent.`;
        uiState.radioProgressPercent = 100;
        uiState.radioProgressLabel = "Write complete.";
        window.alert(`Write complete: ${bytes.byteLength} bytes sent.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Write failed.";
        uiState.radioStatusMessage = `Write failed: ${message}`;
        uiState.radioProgressVisible = false;
        uiState.radioProgressPercent = 0;
        uiState.radioProgressLabel = "";
        window.alert(`Write failed: ${message}`);
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    return;
  }

  if (uiState.activeTab === "zones") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    // Add zone button
    panel.querySelector<HTMLButtonElement>("#add-zone")?.addEventListener("click", () => {
      store.addZone();
    });

    // List item selection
    for (const item of panel.querySelectorAll<HTMLElement>("[data-zone-select]")) {
      item.addEventListener("click", () => {
        const id = Number.parseInt(item.dataset.zoneSelect ?? "", 10);
        if (!Number.isNaN(id)) {
          uiState.selectedZoneId = id;
          store.notifySubscribers();
        }
      });
    }

    // Editor fields
    const nameInput = panel.querySelector<HTMLInputElement>("#zone-editor-name");
    const deleteButton = panel.querySelector<HTMLButtonElement>("#zone-editor-delete");
    const zoneError = panel.querySelector<HTMLElement>("#zone-editor-error");

    const selectedZone = uiState.selectedZoneId
      ? state.document.zones.find((zone) => zone.id === uiState.selectedZoneId)
      : undefined;

    const updateZoneChannels = (nextChannelIds: number[]): void => {
      if (!uiState.selectedZoneId || !selectedZone) {
        return;
      }
      store.updateZone(uiState.selectedZoneId, nameInput?.value ?? selectedZone.name, nextChannelIds);
    };

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        if (uiState.selectedZoneId) {
          const existingIds = selectedZone?.channelIds ?? [];
          store.updateZone(uiState.selectedZoneId, nameInput.value, existingIds);
        }
      });
    }

    for (const toggle of panel.querySelectorAll<HTMLInputElement>("[data-zone-channel-toggle]")) {
      toggle.addEventListener("change", () => {
        const channelId = Number.parseInt(toggle.dataset.zoneChannelToggle ?? "", 10);
        if (!selectedZone || Number.isNaN(channelId)) {
          return;
        }

        const current = [...selectedZone.channelIds];
        const exists = current.includes(channelId);

        if (toggle.checked && !exists) {
          if (current.length >= 16) {
            toggle.checked = false;
            if (zoneError) {
              zoneError.textContent = "A zone can contain at most 16 channels.";
            }
            return;
          }
          updateZoneChannels([...current, channelId]);
          return;
        }

        if (!toggle.checked && exists) {
          updateZoneChannels(current.filter((id) => id !== channelId));
          return;
        }

        if (zoneError) {
          zoneError.textContent = "";
        }
      });
    }

    for (const moveUp of panel.querySelectorAll<HTMLButtonElement>("[data-zone-channel-up]")) {
      moveUp.addEventListener("click", () => {
        const channelId = Number.parseInt(moveUp.dataset.zoneChannelUp ?? "", 10);
        if (!selectedZone || Number.isNaN(channelId)) {
          return;
        }
        const next = [...selectedZone.channelIds];
        const index = next.indexOf(channelId);
        if (index <= 0) {
          return;
        }
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        updateZoneChannels(next);
      });
    }

    for (const moveDown of panel.querySelectorAll<HTMLButtonElement>("[data-zone-channel-down]")) {
      moveDown.addEventListener("click", () => {
        const channelId = Number.parseInt(moveDown.dataset.zoneChannelDown ?? "", 10);
        if (!selectedZone || Number.isNaN(channelId)) {
          return;
        }
        const next = [...selectedZone.channelIds];
        const index = next.indexOf(channelId);
        if (index < 0 || index >= next.length - 1) {
          return;
        }
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        updateZoneChannels(next);
      });
    }

    for (const removeButton of panel.querySelectorAll<HTMLButtonElement>("[data-zone-channel-remove]")) {
      removeButton.addEventListener("click", () => {
        const channelId = Number.parseInt(removeButton.dataset.zoneChannelRemove ?? "", 10);
        if (!selectedZone || Number.isNaN(channelId)) {
          return;
        }
        updateZoneChannels(selectedZone.channelIds.filter((id) => id !== channelId));
      });
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", () => {
        if (uiState.selectedZoneId) {
          store.removeZone(uiState.selectedZoneId);
          uiState.selectedZoneId = null;
        }
      });
    }

    return;
  }

  if (uiState.activeTab !== "channels") {
    return;
  }

  const panel = target.querySelector<HTMLElement>("#active-tab-panel");
  if (!panel) {
    return;
  }

  const document = state.document;
  const filteredChannels = document.channels.filter((channel) => {
    const nameHit = channel.name.toLowerCase().includes(channelState.query.toLowerCase());
    const modeHit = channelState.modeFilter === "all" || channel.channelMode === channelState.modeFilter;
    return nameHit && modeHit;
  });

  // Add channel button
  panel.querySelector<HTMLButtonElement>("#add-channel")?.addEventListener("click", () => {
    store.addChannel();
  });

  // Search and filter
  panel.querySelector<HTMLInputElement>("#channel-search")?.addEventListener("input", (event) => {
    const sourceInput = event.currentTarget as HTMLInputElement;
    const selectionStart = sourceInput.selectionStart;
    const selectionEnd = sourceInput.selectionEnd;
    const selectionDirection = sourceInput.selectionDirection;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    channelState.query = sourceInput.value;
    renderState(target, store, store.getState(), channelState, uiState);

    window.scrollTo(scrollX, scrollY);

    const restoredInput = target.querySelector<HTMLInputElement>("#channel-search");
    if (!restoredInput) {
      return;
    }

    restoredInput.focus({ preventScroll: true });
    if (selectionStart !== null && selectionEnd !== null) {
      restoredInput.setSelectionRange(selectionStart, selectionEnd, selectionDirection ?? "none");
    }
  });

  panel.querySelector<HTMLSelectElement>("#channel-mode-filter")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.modeFilter = value === "Analog" || value === "Digital" ? value : "all";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  // List item selection
  for (const item of panel.querySelectorAll<HTMLElement>("[data-channel-select]")) {
    item.addEventListener("click", () => {
      const id = Number.parseInt(item.dataset.channelSelect ?? "", 10);
      if (!Number.isNaN(id)) {
        uiState.selectedChannelId = id;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });
  }

  // Editor fields
  const nameInput = panel.querySelector<HTMLInputElement>("#channel-editor-name");
  const rxInput = panel.querySelector<HTMLInputElement>("#channel-editor-rx");
  const txInput = panel.querySelector<HTMLInputElement>("#channel-editor-tx");
  const txOffsetInput = panel.querySelector<HTMLInputElement>("#channel-editor-tx-offset");
  const modeSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-mode");
  const colorCodeInput = panel.querySelector<HTMLInputElement>("#channel-editor-color-code");
  const slotSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-slot");
  const bandwidthSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-bandwidth");
  const powerSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-power");
  const contactSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-contact-id");
  const scanListSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-scan-list-id");
  const groupListSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-group-list-id");
  const admitCriteriaSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-admit-criteria");
  const inCallCriteriaSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-in-call-criteria");
  const privacySelect = panel.querySelector<HTMLSelectElement>("#channel-editor-privacy");
  const privacyNumberInput = panel.querySelector<HTMLInputElement>("#channel-editor-privacy-number");
  const totSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-tot");
  const totRekeyInput = panel.querySelector<HTMLInputElement>("#channel-editor-tot-rekey");
  const emergencySystemInput = panel.querySelector<HTMLInputElement>("#channel-editor-emergency-system");
  const rxRefFrequencySelect = panel.querySelector<HTMLSelectElement>("#channel-editor-rx-ref-frequency");
  const txRefFrequencySelect = panel.querySelector<HTMLSelectElement>("#channel-editor-tx-ref-frequency");
  const rxSignallingSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-rx-signalling");
  const txSignallingSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-tx-signalling");
  const ctcssDecodeInput = panel.querySelector<HTMLInputElement>("#channel-editor-ctcss-decode");
  const ctcssEncodeInput = panel.querySelector<HTMLInputElement>("#channel-editor-ctcss-encode");
  const qtReverseSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-qt-reverse");
  const dqtTurnoffSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-dqt-turnoff");
  const rxOnlySelect = panel.querySelector<HTMLSelectElement>("#channel-editor-rx-only");
  const autoscanSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-autoscan");
  const loneWorkerSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-lone-worker");
  const voxSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-vox");
  const allowTalkaroundSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-allow-talkaround");
  const talkaroundSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-talkaround");
  const privateConfirmedSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-private-confirmed");
  const dataConfirmedSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-data-confirmed");
  const emergencyAckSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-emergency-ack");
  const compressedUdpSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-compressed-udp");
  const displayPttSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-display-ptt");
  const receiveGpsSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-receive-gps");
  const sendGpsSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-send-gps");
  const reverseBurstSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-reverse-burst");
  const dcdmSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-dcdm");
  const leaderMsSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-leader-ms");
  const allowInterruptSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-allow-interrupt");
  const decode1Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode1");
  const decode2Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode2");
  const decode3Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode3");
  const decode4Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode4");
  const decode5Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode5");
  const decode6Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode6");
  const decode7Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode7");
  const decode8Select = panel.querySelector<HTMLSelectElement>("#channel-editor-decode8");
  const deleteButton = panel.querySelector<HTMLButtonElement>("#channel-editor-delete");

  const commitChannelChange = (): void => {
    if (uiState.selectedChannelId) {
      const updates: Parameters<typeof store.updateChannel>[1] = {};
      if (nameInput) updates.name = nameInput.value;
      if (rxInput) updates.rxFrequencyMHz = Number.parseFloat(rxInput.value);
      if (txInput) updates.txFrequencyMHz = Number.parseFloat(txInput.value);
      if (txOffsetInput) updates.txOffsetMHz = Number.parseFloat(txOffsetInput.value);
      if (modeSelect) updates.channelMode = modeSelect.value === "Digital" ? "Digital" : "Analog";
      if (colorCodeInput) updates.colorCode = Number.parseInt(colorCodeInput.value, 10);
      if (slotSelect) updates.repeaterSlot = Number.parseInt(slotSelect.value, 10) === 2 ? 2 : 1;
      if (bandwidthSelect) updates.bandwidthKhz = bandwidthSelect.value === "20" || bandwidthSelect.value === "25" ? bandwidthSelect.value : "12.5";
      if (powerSelect) updates.power = powerSelect.value === "Low" ? "Low" : "High";
      if (contactSelect) {
        const contactId = Number.parseInt(contactSelect.value, 10);
        updates.contactId = Number.isNaN(contactId) ? undefined : contactId;
      }
      if (scanListSelect) {
        const scanListId = Number.parseInt(scanListSelect.value, 10);
        updates.scanListId = Number.isNaN(scanListId) ? undefined : scanListId;
      }
      if (groupListSelect) {
        const groupListId = Number.parseInt(groupListSelect.value, 10);
        updates.groupListId = Number.isNaN(groupListId) ? undefined : groupListId;
      }
      if (admitCriteriaSelect) {
        updates.admitCriteria =
          admitCriteriaSelect.value === "Channel free" ||
          admitCriteriaSelect.value === "CTCSS/DCS" ||
          admitCriteriaSelect.value === "Color code"
            ? admitCriteriaSelect.value
            : "Always";
      }
      if (inCallCriteriaSelect) {
        updates.inCallCriteria = inCallCriteriaSelect.value === "Follow Admit Criteria" ? "Follow Admit Criteria" : "Always";
      }
      if (privacySelect) {
        updates.privacy =
          privacySelect.value === "Basic" || privacySelect.value === "Enhanced" ? privacySelect.value : "None";
      }
      if (privacyNumberInput) {
        updates.privacyNumber = Number.parseInt(privacyNumberInput.value, 10);
      }
      if (totSelect) {
        updates.totSec = totSelect.value === "Infinite" ? "Infinite" : Number.parseInt(totSelect.value, 10);
      }
      if (totRekeyInput) {
        updates.totRekeyDelaySec = Number.parseInt(totRekeyInput.value, 10);
      }
      if (emergencySystemInput) {
        updates.emergencySystem = Number.parseInt(emergencySystemInput.value, 10);
      }
      if (rxRefFrequencySelect) {
        updates.rxRefFrequency =
          rxRefFrequencySelect.value === "Medium" || rxRefFrequencySelect.value === "High" ? rxRefFrequencySelect.value : "Low";
      }
      if (txRefFrequencySelect) {
        updates.txRefFrequency =
          txRefFrequencySelect.value === "Medium" || txRefFrequencySelect.value === "High" ? txRefFrequencySelect.value : "Low";
      }
      if (rxSignallingSelect) {
        updates.rxSignallingSystem =
          rxSignallingSelect.value === "DTMF-1" ||
          rxSignallingSelect.value === "DTMF-2" ||
          rxSignallingSelect.value === "DTMF-3" ||
          rxSignallingSelect.value === "DTMF-4"
            ? rxSignallingSelect.value
            : "Off";
      }
      if (txSignallingSelect) {
        updates.txSignallingSystem =
          txSignallingSelect.value === "DTMF-1" ||
          txSignallingSelect.value === "DTMF-2" ||
          txSignallingSelect.value === "DTMF-3" ||
          txSignallingSelect.value === "DTMF-4"
            ? txSignallingSelect.value
            : "Off";
      }
      if (ctcssDecodeInput) {
        updates.ctcssDecode = ctcssDecodeInput.value.trim() || "None";
      }
      if (ctcssEncodeInput) {
        updates.ctcssEncode = ctcssEncodeInput.value.trim() || "None";
      }
      if (qtReverseSelect) {
        updates.qtReverse = qtReverseSelect.value === "120" ? "120" : "180";
      }
      if (dqtTurnoffSelect) {
        updates.nonQtDqtTurnoffFreq =
          dqtTurnoffSelect.value === "259.2 Hz" ||
          dqtTurnoffSelect.value === "55.2 Hz" ||
          dqtTurnoffSelect.value === "Raw-1"
            ? dqtTurnoffSelect.value
            : "None";
      }
      if (rxOnlySelect) updates.rxOnly = rxOnlySelect.value === "On" ? "On" : "Off";
      if (autoscanSelect) updates.autoscan = autoscanSelect.value === "On" ? "On" : "Off";
      if (loneWorkerSelect) updates.loneWorker = loneWorkerSelect.value === "On" ? "On" : "Off";
      if (voxSelect) updates.vox = voxSelect.value === "On" ? "On" : "Off";
      if (allowTalkaroundSelect) updates.allowTalkaround = allowTalkaroundSelect.value === "On" ? "On" : "Off";
      if (talkaroundSelect) updates.talkaround = talkaroundSelect.value === "On" ? "On" : "Off";
      if (privateConfirmedSelect) updates.privateCallConfirmed = privateConfirmedSelect.value === "On" ? "On" : "Off";
      if (dataConfirmedSelect) updates.dataCallConfirmed = dataConfirmedSelect.value === "On" ? "On" : "Off";
      if (emergencyAckSelect) updates.emergencyAlarmAck = emergencyAckSelect.value === "On" ? "On" : "Off";
      if (compressedUdpSelect) updates.compressedUdpDataHeader = compressedUdpSelect.value === "On" ? "On" : "Off";
      if (displayPttSelect) updates.displayPttId = displayPttSelect.value === "On" ? "On" : "Off";
      if (receiveGpsSelect) updates.receiveGpsInfo = receiveGpsSelect.value === "On" ? "On" : "Off";
      if (sendGpsSelect) updates.sendGpsInfo = sendGpsSelect.value === "On" ? "On" : "Off";
      if (reverseBurstSelect) updates.reverseBurst = reverseBurstSelect.value === "On" ? "On" : "Off";
      if (dcdmSelect) updates.dcdmSwitch = dcdmSelect.value === "On" ? "On" : "Off";
      if (leaderMsSelect) updates.leaderMs = leaderMsSelect.value === "On" ? "On" : "Off";
      if (allowInterruptSelect) updates.allowInterrupt = allowInterruptSelect.value === "On" ? "On" : "Off";
      if (decode1Select) updates.decode1 = decode1Select.value === "On" ? "On" : "Off";
      if (decode2Select) updates.decode2 = decode2Select.value === "On" ? "On" : "Off";
      if (decode3Select) updates.decode3 = decode3Select.value === "On" ? "On" : "Off";
      if (decode4Select) updates.decode4 = decode4Select.value === "On" ? "On" : "Off";
      if (decode5Select) updates.decode5 = decode5Select.value === "On" ? "On" : "Off";
      if (decode6Select) updates.decode6 = decode6Select.value === "On" ? "On" : "Off";
      if (decode7Select) updates.decode7 = decode7Select.value === "On" ? "On" : "Off";
      if (decode8Select) updates.decode8 = decode8Select.value === "On" ? "On" : "Off";

      if (rxInput && txInput && txOffsetInput) {
        const rx = Number.parseFloat(rxInput.value);
        const tx = Number.parseFloat(txInput.value);
        if (!Number.isNaN(rx) && !Number.isNaN(tx) && !Number.isNaN(updates.txOffsetMHz ?? Number.NaN)) {
          updates.txFrequencyMHz = tx;
        }
      }
      if (Object.keys(updates).length > 0) {
        if (updates.rxFrequencyMHz !== undefined && updates.txOffsetMHz !== undefined) {
          updates.txFrequencyMHz = updates.rxFrequencyMHz + updates.txOffsetMHz;
        } else if (updates.rxFrequencyMHz !== undefined && updates.txFrequencyMHz !== undefined) {
          updates.txOffsetMHz = updates.txFrequencyMHz - updates.rxFrequencyMHz;
        } else if (updates.txFrequencyMHz !== undefined && rxInput) {
          const rx = Number.parseFloat(rxInput.value);
          if (!Number.isNaN(rx)) {
            updates.txOffsetMHz = updates.txFrequencyMHz - rx;
          }
        }
        store.updateChannel(uiState.selectedChannelId, updates);
      }
    }
  };

  nameInput?.addEventListener("change", commitChannelChange);
  rxInput?.addEventListener("change", commitChannelChange);
  txInput?.addEventListener("change", commitChannelChange);
  txOffsetInput?.addEventListener("change", commitChannelChange);
  modeSelect?.addEventListener("change", commitChannelChange);
  colorCodeInput?.addEventListener("change", commitChannelChange);
  slotSelect?.addEventListener("change", commitChannelChange);
  bandwidthSelect?.addEventListener("change", commitChannelChange);
  powerSelect?.addEventListener("change", commitChannelChange);
  contactSelect?.addEventListener("change", commitChannelChange);
  scanListSelect?.addEventListener("change", commitChannelChange);
  groupListSelect?.addEventListener("change", commitChannelChange);
  admitCriteriaSelect?.addEventListener("change", commitChannelChange);
  inCallCriteriaSelect?.addEventListener("change", commitChannelChange);
  privacySelect?.addEventListener("change", commitChannelChange);
  privacyNumberInput?.addEventListener("change", commitChannelChange);
  totSelect?.addEventListener("change", commitChannelChange);
  totRekeyInput?.addEventListener("change", commitChannelChange);
  emergencySystemInput?.addEventListener("change", commitChannelChange);
  rxRefFrequencySelect?.addEventListener("change", commitChannelChange);
  txRefFrequencySelect?.addEventListener("change", commitChannelChange);
  rxSignallingSelect?.addEventListener("change", commitChannelChange);
  txSignallingSelect?.addEventListener("change", commitChannelChange);
  ctcssDecodeInput?.addEventListener("change", commitChannelChange);
  ctcssEncodeInput?.addEventListener("change", commitChannelChange);
  qtReverseSelect?.addEventListener("change", commitChannelChange);
  dqtTurnoffSelect?.addEventListener("change", commitChannelChange);
  rxOnlySelect?.addEventListener("change", commitChannelChange);
  autoscanSelect?.addEventListener("change", commitChannelChange);
  loneWorkerSelect?.addEventListener("change", commitChannelChange);
  voxSelect?.addEventListener("change", commitChannelChange);
  allowTalkaroundSelect?.addEventListener("change", commitChannelChange);
  talkaroundSelect?.addEventListener("change", commitChannelChange);
  privateConfirmedSelect?.addEventListener("change", commitChannelChange);
  dataConfirmedSelect?.addEventListener("change", commitChannelChange);
  emergencyAckSelect?.addEventListener("change", commitChannelChange);
  compressedUdpSelect?.addEventListener("change", commitChannelChange);
  displayPttSelect?.addEventListener("change", commitChannelChange);
  receiveGpsSelect?.addEventListener("change", commitChannelChange);
  sendGpsSelect?.addEventListener("change", commitChannelChange);
  reverseBurstSelect?.addEventListener("change", commitChannelChange);
  dcdmSelect?.addEventListener("change", commitChannelChange);
  leaderMsSelect?.addEventListener("change", commitChannelChange);
  allowInterruptSelect?.addEventListener("change", commitChannelChange);
  decode1Select?.addEventListener("change", commitChannelChange);
  decode2Select?.addEventListener("change", commitChannelChange);
  decode3Select?.addEventListener("change", commitChannelChange);
  decode4Select?.addEventListener("change", commitChannelChange);
  decode5Select?.addEventListener("change", commitChannelChange);
  decode6Select?.addEventListener("change", commitChannelChange);
  decode7Select?.addEventListener("change", commitChannelChange);
  decode8Select?.addEventListener("change", commitChannelChange);

  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      if (uiState.selectedChannelId) {
        store.removeChannel(uiState.selectedChannelId);
        uiState.selectedChannelId = null;
      }
    });
  }

  // Bulk update
  panel.querySelector<HTMLSelectElement>("#bulk-mode")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.bulkMode = value === "Analog" || value === "Digital" ? value : "";
  });

  panel.querySelector<HTMLSelectElement>("#bulk-power")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.bulkPower = value === "Low" || value === "High" ? value : "";
  });

  panel.querySelector<HTMLButtonElement>("#apply-bulk")?.addEventListener("click", () => {
    const patch: {
      channelMode?: "Analog" | "Digital";
      power?: "Low" | "High";
    } = {};
    if (channelState.bulkMode) {
      patch.channelMode = channelState.bulkMode;
    }
    if (channelState.bulkPower) {
      patch.power = channelState.bulkPower;
    }
    if (Object.keys(patch).length === 0) {
      return;
    }
    store.bulkUpdateChannels(
      filteredChannels.map((channel) => channel.id),
      patch,
    );
  });
}

function inferMaker(model: string): string {
  const normalized = model.toLowerCase();
  if (normalized.includes("tyt") || normalized.includes("md380") || normalized.includes("md390")) {
    return "TYT";
  }
  if (normalized.includes("rt3") || normalized.includes("rt8")) {
    return "Retevis";
  }
  return "Unknown";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
