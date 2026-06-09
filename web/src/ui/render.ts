import type { AppState, EditorStore } from "../state/store";

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
          ${renderTabButton("menus", "Menus", uiState.activeTab, true)}
          ${renderTabButton("buttons", "Buttons", uiState.activeTab, true)}
          ${renderTabButton("digital-text", "Digital Text Message", uiState.activeTab, true)}
          ${renderTabButton("encryption", "Encryption", uiState.activeTab, true)}
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
    const firmware = "Not available in Phase 1";
    const cps = "Not available in Phase 1";
    const mcu = "Not available in Phase 1";
    const deviceId = "Not available in Phase 1";
    const frequencyRange = "Not available in Phase 1";
    return `
      <h2>Basic</h2>
      <dl>
        <div><dt>Model</dt><dd>${escapeHtml(document.model || "Unknown")}</dd></div>
        <div><dt>Maker</dt><dd>${escapeHtml(inferMaker(document.model))}</dd></div>
        <div><dt>Firmware Version</dt><dd>${firmware}</dd></div>
        <div><dt>CPS Version</dt><dd>${cps}</dd></div>
        <div><dt>MCU Version</dt><dd>${mcu}</dd></div>
        <div><dt>Unique Device ID</dt><dd>${deviceId}</dd></div>
        <div><dt>Frequency Range</dt><dd>${frequencyRange}</dd></div>
        <div><dt>Variant</dt><dd>${document.variant}</dd></div>
      </dl>
    `;
  }

  if (activeTab === "general") {
    return `
      <h2>General</h2>
      <label>
        Radio Name
        <input id="radio-name" type="text" value="${escapeHtml(document.settings.radioName)}" maxlength="16" />
      </label>
      <label>
        DMR ID
        <input id="radio-id" type="number" value="${document.settings.radioId}" min="1" step="1" />
      </label>
      <div class="disabled-grid">
        <label>VOX Sensitivity<input disabled value="Not supported yet" /></label>
        <label>TX Preamble Duration<input disabled value="Not supported yet" /></label>
        <label>RX Low Battery Alarm Interval<input disabled value="Not supported yet" /></label>
        <label>Backlight Timeout<input disabled value="Not supported yet" /></label>
        <label>Keypad Auto Lock<input disabled value="Not supported yet" /></label>
        <label>Boot Up Message Line 1<input disabled value="Not supported yet" /></label>
        <label>Boot Up Message Line 2<input disabled value="Not supported yet" /></label>
        <label>Alert Tones<input disabled value="Not supported yet" /></label>
        <label>Time Zone<input disabled value="Not supported yet" /></label>
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
            <div class="form-group">
              <label>
                Channel IDs (comma-separated)
                <input id="zone-editor-channels" type="text" value="${selectedZone.channelIds.join(",")}" placeholder="e.g. 1,2,3" />
              </label>
              <p class="muted-text">Maximum 16 channels per zone</p>
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
    const commit = (): void => {
      if (!radioNameInput || !radioIdInput) {
        return;
      }
      const parsedId = Number.parseInt(radioIdInput.value, 10);
      if (!Number.isNaN(parsedId)) {
        store.updateSettings(radioNameInput.value, parsedId);
      }
    };
    radioNameInput?.addEventListener("change", commit);
    radioIdInput?.addEventListener("change", commit);
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
    const channelsInput = panel.querySelector<HTMLInputElement>("#zone-editor-channels");
    const deleteButton = panel.querySelector<HTMLButtonElement>("#zone-editor-delete");

    if (nameInput) {
      nameInput.addEventListener("change", () => {
        if (uiState.selectedZoneId) {
          const channelIds = parseZoneChannels(channelsInput?.value ?? "");
          store.updateZone(uiState.selectedZoneId, nameInput.value, channelIds);
        }
      });
    }

    if (channelsInput) {
      channelsInput.addEventListener("change", () => {
        if (uiState.selectedZoneId) {
          const channelIds = parseZoneChannels(channelsInput.value);
          store.updateZone(uiState.selectedZoneId, nameInput?.value ?? `Zone ${uiState.selectedZoneId}`, channelIds);
        }
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

function parseZoneChannels(value: string): number[] {
  return value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => !Number.isNaN(id) && id > 0);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
