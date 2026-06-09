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
    target.innerHTML = renderLanding(state.importError);
    bindFileInputs(target, store);
    return;
  }

  target.innerHTML = renderLoadedLayout(state, uiState);
  bindFileInputs(target, store);
  bindTopActions(target, store);
  bindTabs(target, uiState, state, store, channelState);

  const activeTab = target.querySelector<HTMLElement>("#active-tab-panel");
  const validation = target.querySelector<HTMLElement>("#validation");
  if (!activeTab || !validation) {
    return;
  }

  const { document } = state;
  const activeContent = renderActiveTab(document, uiState.activeTab, channelState);
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

function renderLanding(importError?: string): string {
  return `
    <main class="layout">
      <section class="hero card">
        <h1>MD380 Codeplug Editor</h1>
        <p>Phase 1 workflow: read with the Python helper, edit in browser, then write back safely.</p>
      </section>

      <section class="tiles">
        <article class="card tile muted">
          <h2>Create New Codeplug</h2>
          <p>Not available in Phase 1.</p>
          <button class="button" disabled>Create New (Coming Soon)</button>
        </article>

        <article class="card tile">
          <h2>Open Existing Codeplug</h2>
          <ol>
            <li>Run <code>python tools/radio_codeplug_helper.py radio-read --out artifacts/codeplug/read/radio_dump.rdt</code>.</li>
            <li>Select the generated <code>.rdt</code> or <code>.bin</code> file below.</li>
            <li>Edit and export, then write back with <code>radio-write</code>.</li>
          </ol>
          <label class="button">
            Open .rdt/.bin
            <input id="file-input" type="file" accept=".rdt,.bin" hidden />
          </label>
          ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
        </article>
      </section>
    </main>
  `;
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
        <div class="actions">
          <label class="button">
            Open Another File
            <input id="file-input" type="file" accept=".rdt,.bin" hidden />
          </label>
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

function renderActiveTab(document: NonNullable<AppState["document"]>, activeTab: ActiveTab, channelState: ChannelPanelState): string {
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
    return `
      <h2>Zones</h2>
      <p class="muted-text">Maximum 16 channels per zone. Use comma-separated channel IDs to define membership and order.</p>
      <button class="button tiny" id="add-zone">Add Zone</button>
      <div class="rows">
        ${document.zones
          .map(
            (zone) => `
              <div class="row zone-row">
                <input data-zone-name="${zone.id}" value="${escapeHtml(zone.name)}" maxlength="16" />
                <input data-zone-channel-ids="${zone.id}" value="${zone.channelIds.join(",")}" placeholder="channel ids, e.g. 1,2,3" />
                <button class="button ghost tiny" data-zone-delete="${zone.id}">Delete</button>
              </div>
            `,
          )
          .join("")}
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

  const filteredChannels = document.channels.filter((channel) => {
    const nameHit = channel.name.toLowerCase().includes(channelState.query.toLowerCase());
    const modeHit = channelState.modeFilter === "all" || channel.channelMode === channelState.modeFilter;
    return nameHit && modeHit;
  });

  return `
    <h2>Channels</h2>
    <div class="toolbar">
      <button class="button tiny" id="add-channel">Add Channel</button>
      <input id="channel-search" placeholder="Search channel name" value="${escapeHtml(channelState.query)}" />
      <select id="channel-mode-filter">
        <option value="all" ${channelState.modeFilter === "all" ? "selected" : ""}>All Modes</option>
        <option value="Analog" ${channelState.modeFilter === "Analog" ? "selected" : ""}>Analog</option>
        <option value="Digital" ${channelState.modeFilter === "Digital" ? "selected" : ""}>Digital</option>
      </select>
    </div>
    <div class="bulkbar">
      <strong>Bulk Update (${filteredChannels.length})</strong>
      <select id="bulk-mode">
        <option value="" ${channelState.bulkMode === "" ? "selected" : ""}>Mode (unchanged)</option>
        <option value="Analog" ${channelState.bulkMode === "Analog" ? "selected" : ""}>Analog</option>
        <option value="Digital" ${channelState.bulkMode === "Digital" ? "selected" : ""}>Digital</option>
      </select>
      <select id="bulk-power">
        <option value="" ${channelState.bulkPower === "" ? "selected" : ""}>Power (unchanged)</option>
        <option value="Low" ${channelState.bulkPower === "Low" ? "selected" : ""}>Low</option>
        <option value="High" ${channelState.bulkPower === "High" ? "selected" : ""}>High</option>
      </select>
      <button class="button tiny" id="apply-bulk">Apply To Filtered</button>
    </div>
    <div class="rows">
      ${filteredChannels
        .map(
          (channel) => `
            <div class="row channel-row">
              <input data-channel-name="${channel.id}" value="${escapeHtml(channel.name)}" maxlength="16" />
              <input data-channel-rx="${channel.id}" type="number" step="0.00001" min="100" max="1000" value="${channel.rxFrequencyMHz.toFixed(5)}" />
              <input data-channel-tx="${channel.id}" type="number" step="0.00001" min="100" max="1000" value="${channel.txFrequencyMHz.toFixed(5)}" />
              <select data-channel-mode="${channel.id}">
                <option value="Analog" ${channel.channelMode === "Analog" ? "selected" : ""}>Analog</option>
                <option value="Digital" ${channel.channelMode === "Digital" ? "selected" : ""}>Digital</option>
              </select>
              <input data-channel-color-code="${channel.id}" type="number" min="0" max="15" step="1" value="${channel.colorCode}" />
              <select data-channel-slot="${channel.id}">
                <option value="1" ${channel.repeaterSlot === 1 ? "selected" : ""}>TS1</option>
                <option value="2" ${channel.repeaterSlot === 2 ? "selected" : ""}>TS2</option>
              </select>
              <select data-channel-bandwidth="${channel.id}">
                <option value="12.5" ${channel.bandwidthKhz === "12.5" ? "selected" : ""}>12.5</option>
                <option value="20" ${channel.bandwidthKhz === "20" ? "selected" : ""}>20</option>
                <option value="25" ${channel.bandwidthKhz === "25" ? "selected" : ""}>25</option>
              </select>
              <select data-channel-power="${channel.id}">
                <option value="Low" ${channel.power === "Low" ? "selected" : ""}>Low</option>
                <option value="High" ${channel.power === "High" ? "selected" : ""}>High</option>
              </select>
              <select data-channel-contact-id="${channel.id}">
                <option value="">No Contact</option>
                ${document.contacts
                  .map(
                    (contact) =>
                      `<option value="${contact.id}" ${channel.contactId === contact.id ? "selected" : ""}>${escapeHtml(contact.name)}</option>`,
                  )
                  .join("")}
              </select>
              <button class="button ghost tiny" data-channel-delete="${channel.id}">Delete</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
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

function bindTopActions(target: HTMLElement, store: EditorStore): void {
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

    panel.querySelector<HTMLButtonElement>("#add-zone")?.addEventListener("click", () => {
      store.addZone();
    });

    for (const nameInput of panel.querySelectorAll<HTMLInputElement>("[data-zone-name]")) {
      nameInput.addEventListener("change", () => {
        const id = Number.parseInt(nameInput.dataset.zoneName ?? "", 10);
        if (Number.isNaN(id)) {
          return;
        }
        const channelsInput = panel.querySelector<HTMLInputElement>(`[data-zone-channel-ids="${id}"]`);
        const channelIds = parseZoneChannels(channelsInput?.value ?? "");
        store.updateZone(id, nameInput.value, channelIds);
      });
    }

    for (const channelsInput of panel.querySelectorAll<HTMLInputElement>("[data-zone-channel-ids]")) {
      channelsInput.addEventListener("change", () => {
        const id = Number.parseInt(channelsInput.dataset.zoneChannelIds ?? "", 10);
        if (Number.isNaN(id)) {
          return;
        }
        const nameInput = panel.querySelector<HTMLInputElement>(`[data-zone-name="${id}"]`);
        const channelIds = parseZoneChannels(channelsInput.value);
        store.updateZone(id, nameInput?.value ?? `Zone ${id}`, channelIds);
      });
    }

    for (const deleteButton of panel.querySelectorAll<HTMLButtonElement>("[data-zone-delete]")) {
      deleteButton.addEventListener("click", () => {
        const id = Number.parseInt(deleteButton.dataset.zoneDelete ?? "", 10);
        if (!Number.isNaN(id)) {
          store.removeZone(id);
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

  panel.querySelector<HTMLButtonElement>("#add-channel")?.addEventListener("click", () => {
    store.addChannel();
  });

  panel.querySelector<HTMLInputElement>("#channel-search")?.addEventListener("input", (event) => {
    channelState.query = (event.currentTarget as HTMLInputElement).value;
    renderState(target, store, store.getState(), channelState, uiState);
  });

  panel.querySelector<HTMLSelectElement>("#channel-mode-filter")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.modeFilter = value === "Analog" || value === "Digital" ? value : "all";
    renderState(target, store, store.getState(), channelState, uiState);
  });

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

  for (const nameInput of panel.querySelectorAll<HTMLInputElement>("[data-channel-name]")) {
    nameInput.addEventListener("change", () => {
      const id = Number.parseInt(nameInput.dataset.channelName ?? "", 10);
      if (!Number.isNaN(id)) {
        store.updateChannel(id, { name: nameInput.value });
      }
    });
  }

  for (const contactInput of panel.querySelectorAll<HTMLSelectElement>("[data-channel-contact-id]")) {
    contactInput.addEventListener("change", () => {
      const id = Number.parseInt(contactInput.dataset.channelContactId ?? "", 10);
      if (Number.isNaN(id)) {
        return;
      }
      const contactId = Number.parseInt(contactInput.value, 10);
      store.updateChannel(id, { contactId: Number.isNaN(contactId) ? undefined : contactId });
    });
  }

  for (const rxInput of panel.querySelectorAll<HTMLInputElement>("[data-channel-rx]")) {
    rxInput.addEventListener("change", () => {
      const id = Number.parseInt(rxInput.dataset.channelRx ?? "", 10);
      const value = Number.parseFloat(rxInput.value);
      if (!Number.isNaN(id) && !Number.isNaN(value)) {
        store.updateChannel(id, { rxFrequencyMHz: value });
      }
    });
  }

  for (const txInput of panel.querySelectorAll<HTMLInputElement>("[data-channel-tx]")) {
    txInput.addEventListener("change", () => {
      const id = Number.parseInt(txInput.dataset.channelTx ?? "", 10);
      const value = Number.parseFloat(txInput.value);
      if (!Number.isNaN(id) && !Number.isNaN(value)) {
        store.updateChannel(id, { txFrequencyMHz: value });
      }
    });
  }

  for (const modeInput of panel.querySelectorAll<HTMLSelectElement>("[data-channel-mode]")) {
    modeInput.addEventListener("change", () => {
      const id = Number.parseInt(modeInput.dataset.channelMode ?? "", 10);
      if (!Number.isNaN(id)) {
        store.updateChannel(id, { channelMode: modeInput.value === "Digital" ? "Digital" : "Analog" });
      }
    });
  }

  for (const colorCodeInput of panel.querySelectorAll<HTMLInputElement>("[data-channel-color-code]")) {
    colorCodeInput.addEventListener("change", () => {
      const id = Number.parseInt(colorCodeInput.dataset.channelColorCode ?? "", 10);
      const value = Number.parseInt(colorCodeInput.value, 10);
      if (!Number.isNaN(id) && !Number.isNaN(value)) {
        store.updateChannel(id, { colorCode: value });
      }
    });
  }

  for (const slotInput of panel.querySelectorAll<HTMLSelectElement>("[data-channel-slot]")) {
    slotInput.addEventListener("change", () => {
      const id = Number.parseInt(slotInput.dataset.channelSlot ?? "", 10);
      const value = Number.parseInt(slotInput.value, 10);
      if (!Number.isNaN(id)) {
        store.updateChannel(id, { repeaterSlot: value === 2 ? 2 : 1 });
      }
    });
  }

  for (const bandwidthInput of panel.querySelectorAll<HTMLSelectElement>("[data-channel-bandwidth]")) {
    bandwidthInput.addEventListener("change", () => {
      const id = Number.parseInt(bandwidthInput.dataset.channelBandwidth ?? "", 10);
      if (Number.isNaN(id)) {
        return;
      }
      const value = bandwidthInput.value;
      store.updateChannel(id, {
        bandwidthKhz: value === "20" || value === "25" ? value : "12.5",
      });
    });
  }

  for (const powerInput of panel.querySelectorAll<HTMLSelectElement>("[data-channel-power]")) {
    powerInput.addEventListener("change", () => {
      const id = Number.parseInt(powerInput.dataset.channelPower ?? "", 10);
      if (!Number.isNaN(id)) {
        store.updateChannel(id, { power: powerInput.value === "Low" ? "Low" : "High" });
      }
    });
  }

  for (const deleteButton of panel.querySelectorAll<HTMLButtonElement>("[data-channel-delete]")) {
    deleteButton.addEventListener("click", () => {
      const id = Number.parseInt(deleteButton.dataset.channelDelete ?? "", 10);
      if (!Number.isNaN(id)) {
        store.removeChannel(id);
      }
    });
  }
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
