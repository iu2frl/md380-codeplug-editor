import type { AppState, EditorStore } from "../state/store";
import { radioButtonActionOptions } from "../domain/parser";

interface ChannelPanelState {
  query: string;
  modeFilter: "all" | "Analog" | "Digital";
  bulkMode: "" | "Analog" | "Digital";
  bulkPower: "" | "Low" | "High";
}

type ActiveTab = "basic" | "general" | "digital-contacts" | "zones" | "group-lists" | "scan-lists" | "channels";

interface UiState {
  activeTab: ActiveTab;
  riskAccepted: boolean;
  selectedZoneId: number | null;
  selectedChannelId: number | null;
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
    target.innerHTML = renderLanding(state.importError, uiState.riskAccepted);
    bindFileInputs(target, store);
    bindLandingActions(target, store, state, channelState, uiState);
    return;
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
}

function renderLanding(importError: string | undefined, riskAccepted: boolean): string {
  return `
    <main class="layout">
      <section class="hero card">
        <h1>MD380 Codeplug Editor</h1>
        <p>Phase 1 workflow: read with the Python helper, edit in browser, then write back safely.</p>
      </section>

      <section class="card risk-card">
        <h2>Warning</h2>
        <p class="risk-text">
          This is a beta app. Using it may brick or damage your transceiver.
          By proceeding, you accept all risk and agree that the project maintainer is not responsible for device damage.
        </p>
        <label class="risk-ack">
          <input id="risk-ack" type="checkbox" ${riskAccepted ? "checked" : ""} />
          I understand and accept all risk, including possible device damage or bricking.
        </label>
      </section>

      <section class="tiles">
        <article class="card tile ${riskAccepted ? "" : "muted"}">
          <h2>Create New Codeplug</h2>
          <p>Create-new workflow is not available in Phase 1 yet.</p>
          <button id="create-new-btn" class="button" ${riskAccepted ? "" : "disabled"}>Create New</button>
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

  target.querySelector<HTMLButtonElement>("#create-new-btn")?.addEventListener("click", () => {
    if (!uiState.riskAccepted) {
      return;
    }
    window.alert("Create new codeplug is planned for a later phase and is not available yet.");
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
        <h1>MD380 Codeplug Editor</h1>
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
      <div class="rows">
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
                                <button class="button ghost tiny" data-zone-channel-up="${channelId}" ${index === 0 ? "disabled" : ""}>Up</button>
                                <button class="button ghost tiny" data-zone-channel-down="${channelId}" ${index === selectedZone.channelIds.length - 1 ? "disabled" : ""}>Down</button>
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
      <p class="muted-text">Read-only in current phase. Editing scan lists is planned for a later milestone.</p>
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
      <p class="muted-text">Read-only in current phase. Editing group lists is planned for a later milestone.</p>
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
        key === "channels"
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
      setFieldError(txPreambleDurationInput, preambleError, Number.isNaN(preamble) || preamble < 0 || preamble > 8640 || preamble % 60 !== 0 ? "Preamble must be 0-8640 ms in 60 ms steps." : "");
      setFieldError(rxLowBatteryIntervalInput, lowBatteryError, Number.isNaN(lowBattery) || lowBattery < 0 || lowBattery > 635 || lowBattery % 5 !== 0 ? "Low battery interval must be 0-635 s in 5 s steps." : "");
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
    channelState.query = (event.currentTarget as HTMLInputElement).value;
    renderState(target, store, store.getState(), channelState, uiState);
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
  const modeSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-mode");
  const colorCodeInput = panel.querySelector<HTMLInputElement>("#channel-editor-color-code");
  const slotSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-slot");
  const bandwidthSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-bandwidth");
  const powerSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-power");
  const contactSelect = panel.querySelector<HTMLSelectElement>("#channel-editor-contact-id");
  const deleteButton = panel.querySelector<HTMLButtonElement>("#channel-editor-delete");

  const commitChannelChange = (): void => {
    if (uiState.selectedChannelId) {
      const updates: Parameters<typeof store.updateChannel>[1] = {};
      if (nameInput) updates.name = nameInput.value;
      if (rxInput) updates.rxFrequencyMHz = Number.parseFloat(rxInput.value);
      if (txInput) updates.txFrequencyMHz = Number.parseFloat(txInput.value);
      if (modeSelect) updates.channelMode = modeSelect.value === "Digital" ? "Digital" : "Analog";
      if (colorCodeInput) updates.colorCode = Number.parseInt(colorCodeInput.value, 10);
      if (slotSelect) updates.repeaterSlot = Number.parseInt(slotSelect.value, 10) === 2 ? 2 : 1;
      if (bandwidthSelect) updates.bandwidthKhz = bandwidthSelect.value === "20" || bandwidthSelect.value === "25" ? bandwidthSelect.value : "12.5";
      if (powerSelect) updates.power = powerSelect.value === "Low" ? "Low" : "High";
      if (contactSelect) {
        const contactId = Number.parseInt(contactSelect.value, 10);
        updates.contactId = Number.isNaN(contactId) ? undefined : contactId;
      }
      if (Object.keys(updates).length > 0) {
        store.updateChannel(uiState.selectedChannelId, updates);
      }
    }
  };

  nameInput?.addEventListener("change", commitChannelChange);
  rxInput?.addEventListener("change", commitChannelChange);
  txInput?.addEventListener("change", commitChannelChange);
  modeSelect?.addEventListener("change", commitChannelChange);
  colorCodeInput?.addEventListener("change", commitChannelChange);
  slotSelect?.addEventListener("change", commitChannelChange);
  bandwidthSelect?.addEventListener("change", commitChannelChange);
  powerSelect?.addEventListener("change", commitChannelChange);
  contactSelect?.addEventListener("change", commitChannelChange);

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
