import type { AppState, EditorStore } from "../state/store";

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
  target.innerHTML = `
    <main class="layout">
      <section class="hero card">
        <h1>MD380 Phase 1 Editor</h1>
        <p>Load a local codeplug, validate references, edit key settings, and export safely.</p>
        <div class="actions">
          <label class="button">
            Open .rdt/.bin/.dfu
            <input id="file-input" type="file" accept=".rdt,.bin,.dfu" hidden />
          </label>
          <button id="export-btn" class="button ghost">Export Current File</button>
        </div>
      </section>

      <section class="grid">
        <article class="card" id="summary"></article>
        <article class="card" id="settings"></article>
      </section>

      <section class="grid">
        <article class="card" id="contacts"></article>
        <article class="card" id="channels"></article>
      </section>

      <section class="card" id="zones"></section>

      <section class="card" id="validation"></section>
    </main>
  `;

  const fileInput = target.querySelector<HTMLInputElement>("#file-input");
  const exportButton = target.querySelector<HTMLButtonElement>("#export-btn");

  fileInput?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) {
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    store.load(file.name, new Uint8Array(arrayBuffer));
  });

  exportButton?.addEventListener("click", () => {
    const snapshot = store.getState();
    if (!snapshot?.document) {
      return;
    }
    const bytes = store.exportBytes();
    if (!bytes) {
      return;
    }
    downloadBytes(snapshot.document.outputFileName, bytes);
  });

  store.subscribe((state) => renderState(target, store, state));
}

function renderState(target: HTMLElement, store: EditorStore, state: AppState): void {
  const summary = target.querySelector<HTMLElement>("#summary");
  const settings = target.querySelector<HTMLElement>("#settings");
  const contacts = target.querySelector<HTMLElement>("#contacts");
  const channels = target.querySelector<HTMLElement>("#channels");
  const zones = target.querySelector<HTMLElement>("#zones");
  const validation = target.querySelector<HTMLElement>("#validation");

  if (!summary || !settings || !contacts || !channels || !zones || !validation) {
    return;
  }

  if (!state.document) {
    summary.innerHTML = "<h2>Summary</h2><p>No file loaded yet.</p>";
    settings.innerHTML = "<h2>Settings</h2><p>Load a file to edit radio name and ID.</p>";
    contacts.innerHTML = "<h2>Contacts</h2><p>Load a file to edit contacts.</p>";
    channels.innerHTML = "<h2>Channels</h2><p>Load a file to edit channels.</p>";
    zones.innerHTML = "<h2>Zones</h2><p>Load a file to edit zones.</p>";
    validation.innerHTML = "<h2>Validation</h2><p>Validation issues will appear here.</p>";
    return;
  }

  const { document } = state;

  summary.innerHTML = `
    <h2>Summary</h2>
    <dl>
      <div><dt>File</dt><dd>${document.fileName}</dd></div>
      <div><dt>Format</dt><dd>${document.format.toUpperCase()}</dd></div>
      <div><dt>Variant</dt><dd>${document.variant}</dd></div>
      <div><dt>Model</dt><dd>${document.model || "Unknown"}</dd></div>
      <div><dt>Size</dt><dd>${document.sourceSize} bytes</dd></div>
      <div><dt>Channels</dt><dd>${document.channels.length}</dd></div>
      <div><dt>Zones</dt><dd>${document.zones.length}</dd></div>
      <div><dt>Contacts</dt><dd>${document.contacts.length}</dd></div>
      <div><dt>Dirty</dt><dd>${state.isDirty ? "Yes" : "No"}</dd></div>
    </dl>
  `;

  settings.innerHTML = `
    <h2>Settings</h2>
    <label>
      Radio Name
      <input id="radio-name" type="text" value="${document.settings.radioName}" maxlength="16" />
    </label>
    <label>
      Radio ID
      <input id="radio-id" type="number" value="${document.settings.radioId}" min="1" step="1" />
    </label>
  `;

  const radioNameInput = settings.querySelector<HTMLInputElement>("#radio-name");
  const radioIdInput = settings.querySelector<HTMLInputElement>("#radio-id");

  const commit = (): void => {
    if (!radioNameInput || !radioIdInput) {
      return;
    }
    const parsedId = Number.parseInt(radioIdInput.value, 10);
    if (Number.isNaN(parsedId)) {
      return;
    }
    store.updateSettings(radioNameInput.value, parsedId);
  };

  radioNameInput?.addEventListener("change", commit);
  radioIdInput?.addEventListener("change", commit);

  contacts.innerHTML = `
    <h2>Contacts</h2>
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

  contacts.querySelector<HTMLButtonElement>("#add-contact")?.addEventListener("click", () => {
    store.addContact();
  });

  for (const nameInput of contacts.querySelectorAll<HTMLInputElement>("[data-contact-name]")) {
    nameInput.addEventListener("change", () => {
      const id = Number.parseInt(nameInput.dataset.contactName ?? "", 10);
      const callIdInput = contacts.querySelector<HTMLInputElement>(`[data-contact-call-id=\"${id}\"]`);
      const callId = Number.parseInt(callIdInput?.value ?? "0", 10);
      if (!Number.isNaN(id) && !Number.isNaN(callId)) {
        store.updateContact(id, nameInput.value, callId);
      }
    });
  }

  for (const callIdInput of contacts.querySelectorAll<HTMLInputElement>("[data-contact-call-id]")) {
    callIdInput.addEventListener("change", () => {
      const id = Number.parseInt(callIdInput.dataset.contactCallId ?? "", 10);
      const nameInput = contacts.querySelector<HTMLInputElement>(`[data-contact-name=\"${id}\"]`);
      const callId = Number.parseInt(callIdInput.value, 10);
      if (!Number.isNaN(id) && !Number.isNaN(callId)) {
        store.updateContact(id, nameInput?.value ?? `Contact ${id}`, callId);
      }
    });
  }

  for (const deleteButton of contacts.querySelectorAll<HTMLButtonElement>("[data-contact-delete]")) {
    deleteButton.addEventListener("click", () => {
      const id = Number.parseInt(deleteButton.dataset.contactDelete ?? "", 10);
      if (!Number.isNaN(id)) {
        store.removeContact(id);
      }
    });
  }

  channels.innerHTML = `
    <h2>Channels</h2>
    <button class="button tiny" id="add-channel">Add Channel</button>
    <div class="rows">
      ${document.channels
        .map(
          (channel) => `
            <div class="row">
              <input data-channel-name="${channel.id}" value="${escapeHtml(channel.name)}" maxlength="16" />
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

  channels.querySelector<HTMLButtonElement>("#add-channel")?.addEventListener("click", () => {
    store.addChannel();
  });

  for (const nameInput of channels.querySelectorAll<HTMLInputElement>("[data-channel-name]")) {
    nameInput.addEventListener("change", () => {
      const id = Number.parseInt(nameInput.dataset.channelName ?? "", 10);
      const contactInput = channels.querySelector<HTMLSelectElement>(`[data-channel-contact-id=\"${id}\"]`);
      const contactId = Number.parseInt(contactInput?.value ?? "", 10);
      store.updateChannel(id, nameInput.value, Number.isNaN(contactId) ? undefined : contactId);
    });
  }

  for (const contactInput of channels.querySelectorAll<HTMLSelectElement>("[data-channel-contact-id]")) {
    contactInput.addEventListener("change", () => {
      const id = Number.parseInt(contactInput.dataset.channelContactId ?? "", 10);
      const nameInput = channels.querySelector<HTMLInputElement>(`[data-channel-name=\"${id}\"]`);
      const contactId = Number.parseInt(contactInput.value, 10);
      store.updateChannel(id, nameInput?.value ?? `Channel ${id}`, Number.isNaN(contactId) ? undefined : contactId);
    });
  }

  for (const deleteButton of channels.querySelectorAll<HTMLButtonElement>("[data-channel-delete]")) {
    deleteButton.addEventListener("click", () => {
      const id = Number.parseInt(deleteButton.dataset.channelDelete ?? "", 10);
      if (!Number.isNaN(id)) {
        store.removeChannel(id);
      }
    });
  }

  zones.innerHTML = `
    <h2>Zones</h2>
    <button class="button tiny" id="add-zone">Add Zone</button>
    <div class="rows">
      ${document.zones
        .map(
          (zone) => `
            <div class="row zone-row">
              <input data-zone-name="${zone.id}" value="${escapeHtml(zone.name)}" maxlength="16" />
              <input
                data-zone-channel-ids="${zone.id}"
                value="${zone.channelIds.join(",")}" 
                placeholder="channel ids, e.g. 1,2,3"
              />
              <button class="button ghost tiny" data-zone-delete="${zone.id}">Delete</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  zones.querySelector<HTMLButtonElement>("#add-zone")?.addEventListener("click", () => {
    store.addZone();
  });

  for (const nameInput of zones.querySelectorAll<HTMLInputElement>("[data-zone-name]")) {
    nameInput.addEventListener("change", () => {
      const id = Number.parseInt(nameInput.dataset.zoneName ?? "", 10);
      const channelsInput = zones.querySelector<HTMLInputElement>(`[data-zone-channel-ids=\"${id}\"]`);
      const channelIds = parseZoneChannels(channelsInput?.value ?? "");
      store.updateZone(id, nameInput.value, channelIds);
    });
  }

  for (const channelsInput of zones.querySelectorAll<HTMLInputElement>("[data-zone-channel-ids]")) {
    channelsInput.addEventListener("change", () => {
      const id = Number.parseInt(channelsInput.dataset.zoneChannelIds ?? "", 10);
      const nameInput = zones.querySelector<HTMLInputElement>(`[data-zone-name=\"${id}\"]`);
      const channelIds = parseZoneChannels(channelsInput.value);
      store.updateZone(id, nameInput?.value ?? `Zone ${id}`, channelIds);
    });
  }

  for (const deleteButton of zones.querySelectorAll<HTMLButtonElement>("[data-zone-delete]")) {
    deleteButton.addEventListener("click", () => {
      const id = Number.parseInt(deleteButton.dataset.zoneDelete ?? "", 10);
      if (!Number.isNaN(id)) {
        store.removeZone(id);
      }
    });
  }

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
