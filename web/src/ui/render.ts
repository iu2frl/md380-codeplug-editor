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
    const bytes = store.exportBytes();
    if (!bytes) {
      return;
    }
    downloadBytes("codeplug-export.bin", bytes);
  });

  store.subscribe((state) => renderState(target, store, state));
}

function renderState(target: HTMLElement, store: EditorStore, state: AppState): void {
  const summary = target.querySelector<HTMLElement>("#summary");
  const settings = target.querySelector<HTMLElement>("#settings");
  const validation = target.querySelector<HTMLElement>("#validation");

  if (!summary || !settings || !validation) {
    return;
  }

  if (!state.document) {
    summary.innerHTML = "<h2>Summary</h2><p>No file loaded yet.</p>";
    settings.innerHTML = "<h2>Settings</h2><p>Load a file to edit radio name and ID.</p>";
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
