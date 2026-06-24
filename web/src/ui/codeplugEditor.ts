import type { AppState, EditorStore } from "../state/store";
import { createBlankCodeplugBytes, radioButtonActionLabel, radioButtonActionOptions } from "../domain/parser";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  type BrowserRadioTransport,
  type BrowserTransferProgress,
} from "../transport/browserRadio";
import type { ActiveTab, ChannelPanelState, UiState } from "./uiTypes";
import {
  TIME_ZONE_OPTIONS,
  downloadBytes,
  escapeHtml,
  inferMaker,
  normalizeModelToken,
  setRadioProgress,
  syncRadioProgressUi,
} from "./uiHelpers";
import { showToast, showConfirm, showMembershipPicker } from "./dialog";
import { renderLanguageSelector } from "./languageSelector";
import { t } from "../i18n";

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

const RDT_SIZE = 262709;
const PAYLOAD_SIZE = 262144;
const RDT_HEADER_SIZE = 549;

function toRdtOutputName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "codeplug-export.rdt";
  }
  if (/\.rdt$/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/\.[^/.]+$/, "") + ".rdt";
}

function ensureRdtBytes(document: NonNullable<AppState["document"]>, bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength === RDT_SIZE && document.format === "rdt") {
    return bytes;
  }

  // If we have raw payload bytes, wrap them in a valid RDT envelope.
  if (bytes.byteLength === PAYLOAD_SIZE) {
    const targetModel = document.model.toUpperCase().includes("390") ? "MD390" : "MD380";
    const out = createBlankCodeplugBytes("rdt", targetModel);
    out.set(bytes, RDT_HEADER_SIZE);
    return out;
  }

  // Fallback for unexpected sizes: export original bytes unchanged.
  return bytes;
}

export function renderLoadedLayout(state: AppState, uiState: UiState): string {
  const document = state.document;
  if (!document) {
    return "";
  }

  return `
    <main class="layout">
      <section class="hero card">
        ${renderLanguageSelector(uiState)}
        <h1>${t("app.title")}</h1>
        <p>${t("shell.loaded", { file: escapeHtml(document.fileName), format: document.format.toUpperCase() })}</p>
        <p class="status-line">
          <span class="status-badge ${state.isDirty ? "dirty" : "clean"}">${state.isDirty ? t("shell.status.dirty") : t("shell.status.clean")}</span>
          <span class="status-meta">${t("shell.undoRedo", { undo: state.undoCount, redo: state.redoCount })}</span>
        </p>
        <div class="actions">
          <label class="button">
            ${t("shell.openAnother")}
            <input id="file-input" type="file" accept=".rdt,.bin" hidden />
          </label>
          <button id="undo-btn" class="button ghost" ${state.undoCount === 0 ? "disabled" : ""}>${t("common.undo")}</button>
          <button id="redo-btn" class="button ghost" ${state.redoCount === 0 ? "disabled" : ""}>${t("common.redo")}</button>
          <button id="export-btn" class="button ghost">${t("shell.export")}</button>
          <button id="callsign-back-home-btn" class="button ghost">${t("common.backHome")}</button>
        </div>
      </section>

      <section class="card tabs-card">
        <div class="tabs" role="tablist" aria-label="${t("shell.tablistLabel")}">
          ${renderTabButton("basic", t("tab.basic"), uiState.activeTab, false)}
          ${renderTabButton("general", t("tab.general"), uiState.activeTab, false)}
          ${renderTabButton("menus", t("tab.menus"), uiState.activeTab, false)}
          ${renderTabButton("buttons", t("tab.buttons"), uiState.activeTab, false)}
          ${renderTabButton("digital-text", t("tab.digitalText"), uiState.activeTab, false)}
          ${renderTabButton("encryption", t("tab.encryption"), uiState.activeTab, false)}
          ${renderTabButton("digital-contacts", t("tab.digitalContacts"), uiState.activeTab, false)}
          ${renderTabButton("dtmf", t("tab.dtmf"), uiState.activeTab, false)}
          ${renderTabButton("one-touch", t("tab.oneTouch"), uiState.activeTab, false)}
          ${renderTabButton("zones", t("tab.zones"), uiState.activeTab, false)}
          ${renderTabButton("group-lists", t("tab.groupLists"), uiState.activeTab, false)}
          ${renderTabButton("scan-lists", t("tab.scanLists"), uiState.activeTab, false)}
          ${renderTabButton("channels", t("tab.channels"), uiState.activeTab, false)}
          ${renderTabButton("radio-transfer", t("tab.radioTransfer"), uiState.activeTab, false)}
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

export function renderActiveTab(document: NonNullable<AppState["document"]>, activeTab: ActiveTab, channelState: ChannelPanelState, uiState: UiState): string {
  if (activeTab === "basic") {
    const basic = document.basicInfo;
    return `
      <h2>${t("tab.basic")}</h2>
      <dl>
        <div><dt>${t("editor.basic.model")}</dt><dd>${escapeHtml(document.model || t("editor.value.unknown"))}</dd></div>
        <div><dt>${t("editor.basic.maker")}</dt><dd>${escapeHtml(basic.maker || inferMaker(document.model))}</dd></div>
        <div><dt>${t("editor.basic.firmwareVersion")}</dt><dd>${escapeHtml(basic.firmwareVersion || t("editor.value.notStored"))}</dd></div>
        <div><dt>${t("editor.basic.cpsVersion")}</dt><dd>${escapeHtml(basic.cpsVersion || t("editor.value.unknown"))}</dd></div>
        <div><dt>${t("editor.basic.mcuVersion")}</dt><dd>${escapeHtml(basic.mcuVersion || t("editor.value.notStored"))}</dd></div>
        <div><dt>${t("editor.basic.uniqueDeviceId")}</dt><dd>${escapeHtml(basic.uniqueDeviceId || t("editor.value.notStored"))}</dd></div>
        <div><dt>${t("editor.basic.frequencyRange")}</dt><dd>${escapeHtml(basic.frequencyRange || t("editor.value.unknown"))}</dd></div>
        <div><dt>${t("editor.basic.lastProgrammed")}</dt><dd>${escapeHtml(basic.lastProgrammedTime || t("editor.value.unknown"))}</dd></div>
        <div><dt>${t("editor.basic.variant")}</dt><dd>${document.variant}</dd></div>
      </dl>
    `;
  }

  if (activeTab === "general") {
    return `
      <h2>${t("tab.general")}</h2>
      <div class="general-grid">
        <section class="general-section">
          <h3>${t("editor.general.identity")}</h3>
          <label>
            ${t("editor.general.radioName")}
            <input id="radio-name" type="text" value="${escapeHtml(document.settings.radioName)}" maxlength="16" />
            <small class="field-help">${t("editor.general.radioNameHelp")}</small>
            <small id="radio-name-error" class="field-error"></small>
          </label>
          <label>
            ${t("editor.general.dmrId")}
            <input id="radio-id" type="number" value="${document.settings.radioId}" min="1" step="1" />
            <small class="field-help">${t("editor.general.dmrIdHelp")}</small>
            <small id="radio-id-error" class="field-error"></small>
          </label>
          <label>
            ${t("editor.general.bootLine1")}
            <input id="boot-line-1" type="text" maxlength="10" value="${escapeHtml(document.settings.bootUpMessageLine1)}" />
            <small class="field-help">${t("editor.general.bootLineHelp")}</small>
            <small id="boot-line-1-error" class="field-error"></small>
          </label>
          <label>
            ${t("editor.general.bootLine2")}
            <input id="boot-line-2" type="text" maxlength="10" value="${escapeHtml(document.settings.bootUpMessageLine2)}" />
            <small class="field-help">${t("editor.general.bootLineHelp")}</small>
            <small id="boot-line-2-error" class="field-error"></small>
          </label>
        </section>

        <section class="general-section disabled-grid">
          <h3>${t("editor.general.behavior")}</h3>
          <label>
            ${t("editor.general.voxSensitivity")}
            <input id="vox-sensitivity" type="number" min="1" max="10" step="1" value="${document.settings.voxSensitivity}" />
            <small id="vox-sensitivity-error" class="field-error"></small>
          </label>
          <label>
            ${t("editor.general.txPreamble")}
            <input id="tx-preamble-duration" type="number" min="0" max="8640" step="60" value="${document.settings.txPreambleDurationMs}" />
            <small id="tx-preamble-duration-error" class="field-error"></small>
          </label>
          <label>
            ${t("editor.general.rxLowBattery")}
            <input id="rx-low-battery-interval" type="number" min="0" max="635" step="5" value="${document.settings.rxLowBatteryIntervalSec}" />
            <small id="rx-low-battery-interval-error" class="field-error"></small>
          </label>
        <label>
          ${t("editor.general.backlightTimeout")}
          <select id="backlight-timeout">
            <option value="Always" ${document.settings.backlightTimeoutSec === "Always" ? "selected" : ""}>Always</option>
            <option value="5" ${document.settings.backlightTimeoutSec === "5" ? "selected" : ""}>5</option>
            <option value="10" ${document.settings.backlightTimeoutSec === "10" ? "selected" : ""}>10</option>
            <option value="15" ${document.settings.backlightTimeoutSec === "15" ? "selected" : ""}>15</option>
          </select>
        </label>
        <label>
          ${t("editor.general.keypadAutoLock")}
          <select id="keypad-auto-lock">
            <option value="Manual" ${document.settings.keypadAutoLockSec === "Manual" ? "selected" : ""}>Manual</option>
            <option value="5" ${document.settings.keypadAutoLockSec === "5" ? "selected" : ""}>5</option>
            <option value="10" ${document.settings.keypadAutoLockSec === "10" ? "selected" : ""}>10</option>
            <option value="15" ${document.settings.keypadAutoLockSec === "15" ? "selected" : ""}>15</option>
          </select>
        </label>
        <label>
          ${t("editor.general.alertTones")}
          <select id="alert-tones">
            <option value="On" ${document.settings.alertTones === "On" ? "selected" : ""}>On</option>
            <option value="Off" ${document.settings.alertTones === "Off" ? "selected" : ""}>Off</option>
          </select>
        </label>
        <label>
          ${t("editor.general.timeZone")}
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
      <h2>${t("tab.digitalContacts")}</h2>
      <button class="button tiny" id="add-contact">${t("editor.contacts.add")}</button>
      <div class="rows">
        ${document.contacts
          .map(
            (contact) => `
              <div class="row">
                <input data-contact-name="${contact.id}" value="${escapeHtml(contact.name)}" maxlength="16" />
                <input data-contact-call-id="${contact.id}" type="number" min="1" max="16777215" value="${contact.callId}" />
                <button class="button ghost tiny" data-contact-delete="${contact.id}">${t("common.delete")}</button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "dtmf") {
    return `
      <h2>${t("tab.dtmf")}</h2>
      <p class="muted-text">${t("editor.dtmf.desc")}</p>

      <h3>${t("editor.dtmf.numberKeys")}</h3>
      <div class="rows dtmf-grid">
        ${Array.from({ length: 10 }, (_, digit) => {
          const entry = document.numberKeys.find((item) => item.slot === digit);
          return `
            <label>
              ${t("editor.dtmf.key", { digit })}
              <select data-number-key-slot="${digit}">
                <option value="">${t("common.none")}</option>
                ${document.contacts
                  .map(
                    (contact) =>
                      `<option value="${contact.id}" ${entry?.contactId === contact.id ? "selected" : ""}>#${contact.id} ${escapeHtml(contact.name)}</option>`,
                  )
                  .join("")}
              </select>
            </label>
          `;
        }).join("")}
      </div>

    `;
  }

  if (activeTab === "one-touch") {
    return `
      <h2>${t("tab.oneTouch")}</h2>
      <p class="muted-text">${t("editor.oneTouch.desc")}</p>
      <div class="rows">
        ${Array.from({ length: 6 }, (_, index) => {
          const slot = index + 1;
          const action = document.oneTouchActions.find((item) => item.slot === slot);
          const resolvedAction = action ?? {
            slot,
            mode: "None",
            callType: "Call",
            dtmfSystem: "DTMF-1",
          };

          return `
            <div class="row one-touch-row">
              <span>${t("editor.oneTouch.slot", { slot })}</span>

              <select data-one-touch-mode="${slot}">
                <option value="None" ${resolvedAction.mode === "None" ? "selected" : ""}>None</option>
                <option value="Digital" ${resolvedAction.mode === "Digital" ? "selected" : ""}>Digital</option>
                <option value="Analog" ${resolvedAction.mode === "Analog" ? "selected" : ""}>Analog</option>
              </select>

              ${resolvedAction.mode === "Digital"
                ? `
                  <select data-one-touch-call-type="${slot}">
                    <option value="Call" ${resolvedAction.callType === "Call" ? "selected" : ""}>Call</option>
                    <option value="Text Message" ${resolvedAction.callType === "Text Message" ? "selected" : ""}>Text Message</option>
                  </select>

                  ${resolvedAction.callType === "Text Message"
                    ? `
                      <select data-one-touch-text-message="${slot}">
                        <option value="">${t("common.none")}</option>
                        ${document.textMessages
                          .map(
                            (message) =>
                              `<option value="${message.id}" ${resolvedAction.textMessageId === message.id ? "selected" : ""}>${escapeHtml(String(message.slot ?? message.id))} ${escapeHtml(message.text)}</option>`,
                          )
                          .join("")}
                      </select>
                    `
                    : `
                      <select data-one-touch-contact="${slot}">
                        <option value="">${t("common.none")}</option>
                        ${document.contacts
                          .map(
                            (contact) =>
                              `<option value="${contact.id}" ${resolvedAction.contactId === contact.id ? "selected" : ""}>#${contact.id} ${escapeHtml(contact.name)}</option>`,
                          )
                          .join("")}
                      </select>
                    `}
                `
                : resolvedAction.mode === "Analog"
                  ? `
                    <select data-one-touch-dtmf-system="${slot}">
                      <option value="DTMF-1" ${resolvedAction.dtmfSystem === "DTMF-1" ? "selected" : ""}>DTMF-1</option>
                      <option value="DTMF-2" ${resolvedAction.dtmfSystem === "DTMF-2" ? "selected" : ""}>DTMF-2</option>
                      <option value="DTMF-3" ${resolvedAction.dtmfSystem === "DTMF-3" ? "selected" : ""}>DTMF-3</option>
                      <option value="DTMF-4" ${resolvedAction.dtmfSystem === "DTMF-4" ? "selected" : ""}>DTMF-4</option>
                    </select>
                  `
                  : `<span class="muted-text">${t("editor.oneTouch.noAction")}</span>`}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  if (activeTab === "menus") {
    const rows: Array<{ key: keyof typeof document.menuSettings; label: string }> = [
      { key: "radioDisable", label: t("editor.menus.radioDisable") },
      { key: "radioEnable", label: t("editor.menus.radioEnable") },
      { key: "remoteMonitor", label: t("editor.menus.remoteMonitor") },
      { key: "radioCheck", label: t("editor.menus.radioCheck") },
      { key: "manualDial", label: t("editor.menus.manualDial") },
      { key: "edit", label: t("editor.menus.edit") },
      { key: "callAlert", label: t("editor.menus.callAlert") },
      { key: "textMessage", label: t("editor.menus.textMessage") },
      { key: "toneOrAlert", label: t("editor.menus.toneOrAlert") },
      { key: "talkaround", label: t("editor.menus.talkaround") },
      { key: "outgoingRadio", label: t("editor.menus.outgoingRadio") },
      { key: "answered", label: t("editor.menus.answered") },
      { key: "missed", label: t("editor.menus.missed") },
      { key: "editList", label: t("editor.menus.editList") },
      { key: "scan", label: t("editor.menus.scan") },
      { key: "programKey", label: t("editor.menus.programKey") },
      { key: "vox", label: t("editor.menus.vox") },
      { key: "squelch", label: t("editor.menus.squelch") },
      { key: "ledIndicator", label: t("editor.menus.ledIndicator") },
      { key: "keyboardLock", label: t("editor.menus.keyboardLock") },
      { key: "introScreen", label: t("editor.menus.introScreen") },
      { key: "backlight", label: t("editor.menus.backlight") },
      { key: "power", label: t("editor.menus.power") },
      { key: "gps", label: t("editor.menus.gps") },
      { key: "programRadio", label: t("editor.menus.programRadio") },
      { key: "displayMode", label: t("editor.menus.displayMode") },
      { key: "passwordAndLock", label: t("editor.menus.passwordAndLock") },
    ];
    return `
      <h2>${t("tab.menus")}</h2>
      <label>
        ${t("editor.menus.hangTime")}
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
      <h2>${t("tab.buttons")}</h2>
      <label>
        ${t("editor.buttons.longPress")}
        <input id="long-press-duration" type="number" min="1000" max="3750" step="250" value="${document.longPressDurationMs}" />
      </label>
      <div class="rows">
        ${document.radioButtons
          .map(
            (item) => {
              const selectedOption = { code: item.actionCode, label: radioButtonActionLabel(item.actionCode) };
              const itemOptions = [selectedOption, ...options.filter((option) => option.code !== item.actionCode)];

              return `
              <label>
                ${escapeHtml(item.name)}
                <select data-radio-button="${item.id}">
                  ${itemOptions
                    .map(
                      (option) =>
                        `<option value="${option.code}" ${item.actionCode === option.code ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
            `;
            },
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "digital-text") {
    return `
      <h2>${t("tab.digitalText")}</h2>
      <button class="button tiny" id="add-text-message" ${document.textMessages.length >= 50 ? "disabled" : ""}>${t("editor.text.add")}</button>
      <div class="rows">
        ${document.textMessages
          .map(
            (item) => `
              <div class="row text-message-row">
                <span>${item.slot ?? item.id}</span>
                <input data-text-message="${item.id}" value="${escapeHtml(item.text)}" maxlength="144" />
                <button class="button ghost tiny" data-text-message-delete="${item.id}">${t("common.delete")}</button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (activeTab === "encryption") {
    return `
      <h2>${t("tab.encryption")}</h2>
      <p class="muted-text">${t("editor.encryption.desc")}</p>
      <h3>${t("editor.encryption.enhancedHeading")}</h3>
      <div class="rows">
        ${document.privacySettings.enhancedKeys
          .map(
            (key, index) => `
              <label>
                ${t("editor.encryption.enhanced", { index: index + 1 })}
                <input data-enhanced-key="${index}" value="${escapeHtml(key)}" maxlength="32" />
              </label>
            `,
          )
          .join("")}
      </div>
      <h3>${t("editor.encryption.basicHeading")}</h3>
      <div class="rows">
        ${document.privacySettings.basicKeys
          .map(
            (key, index) => `
              <label>
                ${t("editor.encryption.basic", { index: index + 1 })}
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
    const connectLabel = isConnected ? t("editor.radio.disconnect") : t("editor.radio.connect");
    const readEnabled = isConnected && !uiState.radioBusy;
    const writeEnabled = isConnected && !uiState.radioBusy;

    return `
      <h2>${t("tab.radioTransfer")}</h2>
      <p class="muted-text">${t("editor.radio.desc")}</p>

      <div class="radio-transfer-grid">
        <section class="radio-transfer-card">
          <h3>${t("editor.radio.envCompat")}</h3>
          <ul class="radio-transfer-list">
            <li>${t("editor.radio.secureContext")}: <strong>${capabilities.isSecureContext ? t("common.yes") : t("common.no")}</strong></li>
            <li>${t("editor.radio.webusbApi")}: <strong>${capabilities.hasNavigatorUsb && capabilities.hasRequestDevice ? t("editor.radio.available") : t("editor.radio.unavailable")}</strong></li>
            <li>${t("editor.radio.browser")}: <strong>${escapeHtml(capabilities.userAgent)}</strong></li>
          </ul>
          ${
            capabilities.blockers.length > 0
              ? `<div class="radio-transfer-blocker">${capabilities.blockers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
              : `<p class="ok">${t("editor.radio.compatible")}</p>`
          }
          ${
            capabilities.warnings.length > 0
              ? `<div class="radio-transfer-warning">${capabilities.warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
              : ""
          }
          <button id="radio-transfer-setup-guide-btn" class="button ghost tiny">${t("editor.radio.openSetupGuide")}</button>
        </section>

        <section class="radio-transfer-card">
          <h3>${t("editor.radio.workflow")}</h3>
          <ol class="radio-transfer-list">
            <li>${t("editor.radio.step1")}</li>
            <li>${t("editor.radio.step2")}</li>
            <li>${t("editor.radio.step3")}</li>
            <li>${t("editor.radio.step4")}</li>
          </ol>
          <p class="muted-text" id="radio-transfer-status"><br>${t("editor.radio.status", { message: escapeHtml(uiState.radioStatusMessage) })}</p>
          <div id="radio-transfer-progress-wrap" class="radio-transfer-progress ${uiState.radioProgressVisible ? "" : "hidden"}">
            <progress id="radio-transfer-progress" max="100" value="${uiState.radioProgressPercent}"></progress>
            <p class="muted-text" id="radio-transfer-progress-label">${escapeHtml(uiState.radioProgressLabel)}</p>
          </div>
          <div class="actions">
            <button id="radio-transfer-connect" class="button ghost" ${(capabilities.supported && !uiState.radioBusy) || isConnected ? "" : "disabled"}>${connectLabel}</button>
            <button id="radio-transfer-read" class="button ghost" ${readEnabled ? "" : "disabled"}>${t("editor.radio.read")}</button>
            <button id="radio-transfer-write" class="button ghost" ${writeEnabled ? "" : "disabled"}>${t("editor.radio.write")}</button>
          </div>
        </section>
      </div>
    `;
  }

  if (activeTab === "zones") {
    const selectedZone = uiState.selectedZoneId ? document.zones.find((z) => z.id === uiState.selectedZoneId) : null;
    return `
      <h2>${t("tab.zones")}</h2>
      <div class="two-pane-layout two-pane-even">
        <div class="pane-left">
          <button class="button tiny" id="add-zone">${t("editor.zones.add")}</button>
          <div class="list">
            ${document.zones
              .map(
                (zone) => `
                  <div class="list-item ${zone.id === uiState.selectedZoneId ? "selected" : ""}" data-zone-select="${zone.id}">
                    <div class="list-item-name">${escapeHtml(zone.name)}</div>
                    <div class="list-item-meta">${t("editor.zones.channelsMeta", { count: zone.channelIds.length })}</div>
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
                ${t("editor.zones.name")}
                <input id="zone-editor-name" type="text" value="${escapeHtml(selectedZone.name)}" maxlength="16" />
              </label>
            </div>

            <div class="zone-editor-meta">
              <strong>${t("editor.zones.channelsSelected", { count: selectedZone.channelIds.length })}</strong>
              <small class="muted-text">${t("editor.common.editChannelsHelp")}</small>
              <small id="zone-editor-error" class="field-error"></small>
            </div>

            <section class="zone-editor-panel">
              <div class="zone-editor-panel-head">
                <h3>${t("editor.common.selectedChannelOrder")}</h3>
                <button class="button tiny" id="zone-edit-channels">${t("editor.common.editChannels")}</button>
              </div>
              <div id="zone-selected-channels" class="zone-selected-list">
                ${selectedZone.channelIds.length === 0
                  ? `<p class="muted-text">${t("editor.common.noChannelsSelected")}</p>`
                  : selectedZone.channelIds
                      .map((channelId, index) => {
                        const channel = document.channels.find((item) => item.id === channelId);
                        return `
                            <div class="zone-selected-row" data-zone-selected-row="${channelId}">
                              <span class="zone-selected-name">${index + 1}. #${channelId} ${escapeHtml(channel?.name ?? t("editor.value.unknown"))}</span>
                              <div class="zone-selected-actions">
                                <button class="button ghost tiny zone-order-button" title="${t("editor.common.moveChannelUp")}" aria-label="${t("editor.common.moveChannelUp")}" data-zone-channel-up="${channelId}" ${index === 0 ? "disabled" : ""}>&uarr;</button>
                                <button class="button ghost tiny zone-order-button" title="${t("editor.common.moveChannelDown")}" aria-label="${t("editor.common.moveChannelDown")}" data-zone-channel-down="${channelId}" ${index === selectedZone.channelIds.length - 1 ? "disabled" : ""}>&darr;</button>
                                <button class="button ghost tiny" data-zone-channel-remove="${channelId}">${t("common.remove")}</button>
                              </div>
                            </div>
                          `;
                      })
                      .join("")}
              </div>
            </section>

            <div class="form-actions">
              <button class="button tiny" id="zone-editor-delete">${t("editor.zones.delete")}</button>
            </div>
          `
              : `<p class="muted-text">${t("editor.zones.selectToEdit")}</p>`
          }
        </div>
      </div>
    `;
  }


  if (activeTab === "scan-lists") {
    const selectedScanListId = uiState.selectedScanListId;
    const selectedScanList = selectedScanListId ? document.scanLists.find((item) => item.id === selectedScanListId) : undefined;
    const selectedScanChannelIds = selectedScanList?.channelIds ?? [];

    return `
      <h2>${t("tab.scanLists")}</h2>
      <div class="two-pane-layout two-pane-even">
        <div class="pane-left">
          <button class="button tiny" id="add-scan-list">${t("editor.scan.add")}</button>
          <div class="list">
            ${document.scanLists.length === 0
              ? `<p class="muted-text">${t("editor.scan.empty")}</p>`
              : document.scanLists
                  .map(
                    (scanList) => `
                      <div class="list-item ${scanList.id === selectedScanListId ? "selected" : ""}" data-scan-list-select="${scanList.id}">
                        <div class="list-item-name">${escapeHtml(scanList.name)}</div>
                        <div class="list-item-meta">${t("editor.scan.channelsMeta", { count: (scanList.channelIds ?? []).length })}</div>
                      </div>
                    `,
                  )
                  .join("")}
          </div>
        </div>

        <div class="pane-right">
          ${selectedScanList
            ? `
            <div class="form-group">
              <label>
                ${t("editor.scan.name")}
                <input data-scan-list-name="${selectedScanList.id}" value="${escapeHtml(selectedScanList.name)}" maxlength="16" />
              </label>
            </div>

            <section class="zone-editor-panel">
              <h3>${t("editor.scan.behavior")}</h3>
              <div class="settings-grid">
                <div class="form-group">
                  <label>
                    ${t("editor.scan.signallingHold")}
                    <input type="number" data-scan-list-signalling-time="${selectedScanList.id}" value="${selectedScanList.signalingHoldTimeMs}" min="50" max="6375" step="25" />
                  </label>
                </div>

                <div class="form-group">
                  <label>
                    ${t("editor.scan.prioritySample")}
                    <input type="number" data-scan-list-priority-sample-time="${selectedScanList.id}" value="${selectedScanList.prioritySampleTimeMs}" min="750" max="7750" step="250" />
                  </label>
                </div>

                <div class="form-group">
                  <label>
                    ${t("editor.scan.priorityCh1")}
                    <select data-scan-list-priority-channel-1="${selectedScanList.id}">
                      <option value="">${t("common.none")}</option>
                      ${document.channels.map((ch) => `<option value="${ch.id}" ${selectedScanList.priorityChannel1Id === ch.id ? "selected" : ""}>#${ch.id} ${escapeHtml(ch.name)}</option>`).join("")}
                    </select>
                  </label>
                </div>

                <div class="form-group">
                  <label>
                    ${t("editor.scan.priorityCh2")}
                    <select data-scan-list-priority-channel-2="${selectedScanList.id}" ${!selectedScanList.priorityChannel1Id ? "disabled" : ""}>
                      <option value="">${t("common.none")}</option>
                      ${document.channels.map((ch) => `<option value="${ch.id}" ${selectedScanList.priorityChannel2Id === ch.id ? "selected" : ""}>#${ch.id} ${escapeHtml(ch.name)}</option>`).join("")}
                    </select>
                  </label>
                </div>

                <div class="form-group">
                  <label>
                    ${t("editor.scan.txDesignated")}
                    <select data-scan-list-tx-mode="${selectedScanList.id}">
                      <option value="Selected" ${selectedScanList.txDesignatedChannelMode === "Selected" ? "selected" : ""}>Selected</option>
                      <option value="Last Active Channel" ${selectedScanList.txDesignatedChannelMode === "Last Active Channel" ? "selected" : ""}>Last Active Channel</option>
                    </select>
                  </label>
                </div>

                ${selectedScanList.txDesignatedChannelMode === "Selected"
                  ? `
                <div class="form-group">
                  <label>
                    ${t("editor.scan.designatedChannel")}
                    <select data-scan-list-tx-channel="${selectedScanList.id}">
                      <option value="">${t("common.none")}</option>
                      ${document.channels.map((ch) => `<option value="${ch.id}" ${selectedScanList.txDesignatedChannelId === ch.id ? "selected" : ""}>#${ch.id} ${escapeHtml(ch.name)}</option>`).join("")}
                    </select>
                  </label>
                </div>
                  `
                  : ""}
              </div>
            </section>

            <div class="zone-editor-meta">
              <strong>${t("editor.scan.channelsSelected", { count: selectedScanChannelIds.length })}</strong>
              <small class="muted-text">${t("editor.common.editChannelsHelp")}</small>
              <small id="scan-list-editor-error" class="field-error"></small>
            </div>

            <section class="zone-editor-panel">
              <div class="zone-editor-panel-head">
                <h3>${t("editor.common.selectedChannelOrder")}</h3>
                <button class="button tiny" id="scan-list-edit-channels">${t("editor.common.editChannels")}</button>
              </div>
              <div class="zone-selected-list">
                ${selectedScanChannelIds.length === 0
                  ? `<p class="muted-text">${t("editor.common.noChannelsSelected")}</p>`
                  : selectedScanChannelIds
                      .map((channelId, index) => {
                        const channel = document.channels.find((item) => item.id === channelId);
                        return `
                            <div class="zone-selected-row" data-scan-list-selected-row="${channelId}">
                              <span class="zone-selected-name">${index + 1}. #${channelId} ${escapeHtml(channel?.name ?? t("editor.value.unknown"))}</span>
                              <div class="zone-selected-actions">
                                <button class="button ghost tiny zone-order-button" title="${t("editor.common.moveChannelUp")}" aria-label="${t("editor.common.moveChannelUp")}" data-scan-list-channel-up="${channelId}" ${index === 0 ? "disabled" : ""}>&uarr;</button>
                                <button class="button ghost tiny zone-order-button" title="${t("editor.common.moveChannelDown")}" aria-label="${t("editor.common.moveChannelDown")}" data-scan-list-channel-down="${channelId}" ${index === selectedScanChannelIds.length - 1 ? "disabled" : ""}>&darr;</button>
                                <button class="button ghost tiny" data-scan-list-channel-remove="${channelId}">${t("common.remove")}</button>
                              </div>
                            </div>
                          `;
                      })
                      .join("")}
              </div>
            </section>

            <div class="form-actions">
              <button class="button tiny" id="scan-list-editor-delete">${t("editor.scan.delete")}</button>
            </div>
            `
            : `<p class="muted-text">${t("editor.scan.selectToEdit")}</p>`
          }
        </div>
      </div>
    `;
  }

  if (activeTab === "group-lists") {
    const selectedGroupListId = uiState.selectedGroupListId;
    const selectedGroupList = selectedGroupListId ? document.groupLists.find((item) => item.id === selectedGroupListId) : undefined;
    const selectedGroupContactIds = selectedGroupList?.contactIds ?? [];

    return `
      <h2>${t("tab.groupLists")}</h2>
      <div class="two-pane-layout two-pane-even">
        <div class="pane-left">
          <button class="button tiny" id="add-group-list">${t("editor.groups.add")}</button>
          <div class="list">
            ${document.groupLists.length === 0
              ? `<p class="muted-text">${t("editor.groups.empty")}</p>`
              : document.groupLists
                  .map(
                    (groupList) => `
                      <div class="list-item ${groupList.id === selectedGroupListId ? "selected" : ""}" data-group-list-select="${groupList.id}">
                        <div class="list-item-name">${escapeHtml(groupList.name)}</div>
                        <div class="list-item-meta">${t("editor.groups.contactsMeta", { count: (groupList.contactIds ?? []).length })}</div>
                      </div>
                    `,
                  )
                  .join("")}
          </div>
        </div>
        <div class="pane-right">
          ${selectedGroupList
            ? `
            <div class="form-group">
              <label>
                ${t("editor.groups.name")}
                <input data-group-list-name="${selectedGroupList.id}" value="${escapeHtml(selectedGroupList.name)}" maxlength="16" />
              </label>
            </div>

            <div class="zone-editor-meta">
              <strong>${t("editor.groups.contactsSelected", { count: selectedGroupContactIds.length })}</strong>
              <small class="muted-text">${t("editor.groups.editContactsHelp")}</small>
              <small id="group-list-editor-error" class="field-error"></small>
            </div>

            <section class="zone-editor-panel">
              <div class="zone-editor-panel-head">
                <h3>${t("editor.groups.selectedContactOrder")}</h3>
                <button class="button tiny" id="group-list-edit-contacts">${t("editor.groups.editContacts")}</button>
              </div>
              <div class="zone-selected-list">
                ${selectedGroupContactIds.length === 0
                  ? `<p class="muted-text">${t("editor.groups.noContactsSelected")}</p>`
                  : selectedGroupContactIds
                      .map((contactId, index) => {
                        const contact = document.contacts.find((item) => item.id === contactId);
                        return `
                            <div class="zone-selected-row" data-group-list-selected-row="${contactId}">
                              <span class="zone-selected-name">${index + 1}. #${contactId} ${escapeHtml(contact?.name ?? t("editor.value.unknown"))}</span>
                              <div class="zone-selected-actions">
                                <button class="button ghost tiny zone-order-button" title="${t("editor.groups.moveContactUp")}" aria-label="${t("editor.groups.moveContactUp")}" data-group-list-contact-up="${contactId}" ${index === 0 ? "disabled" : ""}>&uarr;</button>
                                <button class="button ghost tiny zone-order-button" title="${t("editor.groups.moveContactDown")}" aria-label="${t("editor.groups.moveContactDown")}" data-group-list-contact-down="${contactId}" ${index === selectedGroupContactIds.length - 1 ? "disabled" : ""}>&darr;</button>
                                <button class="button ghost tiny" data-group-list-contact-remove="${contactId}">${t("common.remove")}</button>
                              </div>
                            </div>
                          `;
                      })
                      .join("")}
              </div>
            </section>

            <div class="form-actions">
              <button class="button tiny" id="group-list-editor-delete">${t("editor.groups.delete")}</button>
            </div>
            `
            : `<p class="muted-text">${t("editor.groups.selectToEdit")}</p>`
          }
        </div>
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
    const filteredIds = new Set(filteredChannels.map((channel) => channel.id));
    const selectedInFilterCount = channelState.bulkSelectionIds.filter((id) => filteredIds.has(id)).length;

    return `
      <h2>${t("tab.channels")}</h2>
      <div class="two-pane-layout">
        <div class="pane-left">
          <div class="toolbar">
            <button class="button tiny" id="add-channel">${t("editor.channels.add")}</button>
            <input id="channel-search" placeholder="${t("editor.channels.search")}" value="${escapeHtml(channelState.query)}" />
            <select id="channel-mode-filter">
              <option value="all" ${channelState.modeFilter === "all" ? "selected" : ""}>${t("editor.channels.allModes")}</option>
              <option value="Analog" ${channelState.modeFilter === "Analog" ? "selected" : ""}>Analog</option>
              <option value="Digital" ${channelState.modeFilter === "Digital" ? "selected" : ""}>Digital</option>
            </select>
          </div>
          <div class="list">
            ${filteredChannels
              .map(
                (channel) => `
                  <div class="list-item ${channel.id === uiState.selectedChannelId ? "selected" : ""}" data-channel-select="${channel.id}">
                    <label class="channel-bulk-select" title="${t("editor.channels.bulkSelectTitle")}">
                      <input type="checkbox" data-channel-bulk-toggle="${channel.id}" ${channelState.bulkSelectionIds.includes(channel.id) ? "checked" : ""} />
                    </label>
                    <div class="list-item-content">
                      <div class="list-item-name">${escapeHtml(channel.name)}</div>
                      <div class="list-item-meta">${channel.rxFrequencyMHz.toFixed(4)} MHz (${channel.channelMode})</div>
                    </div>
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
            <div class="channel-form">
            <section class="channel-section">
              <h3>${t("editor.channels.sectionIdentity")}</h3>
              <div class="channel-grid">
            <div class="form-group">
              <label>
                ${t("editor.channels.name")}
                <input id="channel-editor-name" type="text" value="${escapeHtml(selectedChannel.name)}" maxlength="16" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.rxFrequency")}
                <input id="channel-editor-rx" type="number" step="0.00001" min="100" max="1000" value="${selectedChannel.rxFrequencyMHz.toFixed(5)}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.txFrequency")}
                <input id="channel-editor-tx" type="number" step="0.00001" min="100" max="1000" value="${selectedChannel.txFrequencyMHz.toFixed(5)}" readonly disabled/>
              </label>
              <small class="muted-text">${t("editor.channels.txFrequencyHelp")}</small>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.txOffset")}
                <input id="channel-editor-tx-offset" type="number" step="0.00001" min="-100" max="100" value="${selectedChannel.txOffsetMHz.toFixed(5)}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.mode")}
                <select id="channel-editor-mode">
                  <option value="Analog" ${selectedChannel.channelMode === "Analog" ? "selected" : ""}>Analog</option>
                  <option value="Digital" ${selectedChannel.channelMode === "Digital" ? "selected" : ""}>Digital</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.colorCode")}
                <input id="channel-editor-color-code" type="number" min="0" max="15" step="1" value="${selectedChannel.colorCode}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.timeSlot")}
                <select id="channel-editor-slot">
                  <option value="1" ${selectedChannel.repeaterSlot === 1 ? "selected" : ""}>TS1</option>
                  <option value="2" ${selectedChannel.repeaterSlot === 2 ? "selected" : ""}>TS2</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.bandwidth")}
                <select id="channel-editor-bandwidth">
                  <option value="12.5" ${selectedChannel.bandwidthKhz === "12.5" ? "selected" : ""}>12.5</option>
                  <option value="20" ${selectedChannel.bandwidthKhz === "20" ? "selected" : ""}>20</option>
                  <option value="25" ${selectedChannel.bandwidthKhz === "25" ? "selected" : ""}>25</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.power")}
                <select id="channel-editor-power">
                  <option value="Low" ${selectedChannel.power === "Low" ? "selected" : ""}>Low</option>
                  <option value="High" ${selectedChannel.power === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
              </div>
            </section>
            <section class="channel-section">
              <h3>${t("editor.channels.sectionContacts")}</h3>
              <div class="channel-grid">
            <div class="form-group">
              <label>
                ${t("editor.channels.contact")}
                <select id="channel-editor-contact-id">
                  <option value="">${t("editor.channels.noContact")}</option>
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
                ${t("editor.channels.scanList")}
                <select id="channel-editor-scan-list-id">
                  <option value="">${t("common.none")}</option>
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
                ${t("editor.channels.rxGroupList")}
                <select id="channel-editor-group-list-id">
                  <option value="">${t("common.none")}</option>
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
                ${t("editor.channels.admitCriteria")}
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
                ${t("editor.channels.inCallCriteria")}
                <select id="channel-editor-in-call-criteria">
                  <option value="Always" ${selectedChannel.inCallCriteria === "Always" ? "selected" : ""}>Always</option>
                  <option value="Follow Admit Criteria" ${selectedChannel.inCallCriteria === "Follow Admit Criteria" ? "selected" : ""}>Follow Admit Criteria</option>
                </select>
              </label>
            </div>
              </div>
            </section>
            <section class="channel-section">
              <h3>${t("editor.channels.sectionPrivacy")}</h3>
              <div class="channel-grid">
            <div class="form-group">
              <label>
                ${t("editor.channels.privacy")}
                <select id="channel-editor-privacy">
                  <option value="None" ${selectedChannel.privacy === "None" ? "selected" : ""}>None</option>
                  <option value="Basic" ${selectedChannel.privacy === "Basic" ? "selected" : ""}>Basic</option>
                  <option value="Enhanced" ${selectedChannel.privacy === "Enhanced" ? "selected" : ""}>Enhanced</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.privacyNumber")}
                <input id="channel-editor-privacy-number" type="number" min="1" max="16" step="1" value="${selectedChannel.privacyNumber}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.tot")}
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
                ${t("editor.channels.totRekey")}
                <input id="channel-editor-tot-rekey" type="number" min="0" max="255" step="1" value="${selectedChannel.totRekeyDelaySec}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.emergencySystem")}
                <input id="channel-editor-emergency-system" type="number" min="0" max="32" step="1" value="${selectedChannel.emergencySystem}" />
              </label>
            </div>
              </div>
            </section>
            <section class="channel-section">
              <h3>${t("editor.channels.sectionReference")}</h3>
              <div class="channel-grid">
            <div class="form-group">
              <label>
                ${t("editor.channels.rxRefFrequency")}
                <select id="channel-editor-rx-ref-frequency">
                  <option value="Low" ${selectedChannel.rxRefFrequency === "Low" ? "selected" : ""}>Low</option>
                  <option value="Medium" ${selectedChannel.rxRefFrequency === "Medium" ? "selected" : ""}>Medium</option>
                  <option value="High" ${selectedChannel.rxRefFrequency === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.txRefFrequency")}
                <select id="channel-editor-tx-ref-frequency">
                  <option value="Low" ${selectedChannel.txRefFrequency === "Low" ? "selected" : ""}>Low</option>
                  <option value="Medium" ${selectedChannel.txRefFrequency === "Medium" ? "selected" : ""}>Medium</option>
                  <option value="High" ${selectedChannel.txRefFrequency === "High" ? "selected" : ""}>High</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.rxSignalling")}
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
                ${t("editor.channels.txSignalling")}
                <select id="channel-editor-tx-signalling">
                  <option value="Off" ${selectedChannel.txSignallingSystem === "Off" ? "selected" : ""}>Off</option>
                  <option value="DTMF-1" ${selectedChannel.txSignallingSystem === "DTMF-1" ? "selected" : ""}>DTMF-1</option>
                  <option value="DTMF-2" ${selectedChannel.txSignallingSystem === "DTMF-2" ? "selected" : ""}>DTMF-2</option>
                  <option value="DTMF-3" ${selectedChannel.txSignallingSystem === "DTMF-3" ? "selected" : ""}>DTMF-3</option>
                  <option value="DTMF-4" ${selectedChannel.txSignallingSystem === "DTMF-4" ? "selected" : ""}>DTMF-4</option>
                </select>
              </label>
            </div>
              </div>
            </section>
            <section class="channel-section">
              <h3>${t("editor.channels.sectionTones")}</h3>
              <div class="channel-grid">
            <div class="form-group">
              <label>
                ${t("editor.channels.ctcssDecode")}
                <input id="channel-editor-ctcss-decode" type="text" value="${escapeHtml(selectedChannel.ctcssDecode)}" placeholder="${t("editor.channels.ctcssPlaceholder")}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.ctcssEncode")}
                <input id="channel-editor-ctcss-encode" type="text" value="${escapeHtml(selectedChannel.ctcssEncode)}" placeholder="${t("editor.channels.ctcssPlaceholder")}" />
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.qtReverse")}
                <select id="channel-editor-qt-reverse">
                  <option value="180" ${selectedChannel.qtReverse === "180" ? "selected" : ""}>180</option>
                  <option value="120" ${selectedChannel.qtReverse === "120" ? "selected" : ""}>120</option>
                </select>
              </label>
            </div>
            <div class="form-group">
              <label>
                ${t("editor.channels.dqtTurnoff")}
                <select id="channel-editor-dqt-turnoff">
                  <option value="None" ${selectedChannel.nonQtDqtTurnoffFreq === "None" ? "selected" : ""}>None</option>
                  <option value="Raw-1" ${selectedChannel.nonQtDqtTurnoffFreq === "Raw-1" ? "selected" : ""}>Unknown (raw 1)</option>
                  <option value="259.2 Hz" ${selectedChannel.nonQtDqtTurnoffFreq === "259.2 Hz" ? "selected" : ""}>259.2 Hz</option>
                  <option value="55.2 Hz" ${selectedChannel.nonQtDqtTurnoffFreq === "55.2 Hz" ? "selected" : ""}>55.2 Hz</option>
                </select>
              </label>
            </div>
              </div>
            </section>
            <section class="channel-section">
              <h3>${t("editor.channels.sectionAdvanced")}</h3>
            <div class="disabled-grid">
              <label>${t("editor.channels.rxOnly")}<select id="channel-editor-rx-only"><option value="Off" ${selectedChannel.rxOnly === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.rxOnly === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.autoscan")}<select id="channel-editor-autoscan"><option value="Off" ${selectedChannel.autoscan === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.autoscan === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.loneWorker")}<select id="channel-editor-lone-worker"><option value="Off" ${selectedChannel.loneWorker === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.loneWorker === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.vox")}<select id="channel-editor-vox"><option value="Off" ${selectedChannel.vox === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.vox === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.allowTalkaround")}<select id="channel-editor-allow-talkaround"><option value="Off" ${selectedChannel.allowTalkaround === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.allowTalkaround === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.talkaround")}<select id="channel-editor-talkaround"><option value="Off" ${selectedChannel.talkaround === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.talkaround === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.privateCallConfirmed")}<select id="channel-editor-private-confirmed"><option value="Off" ${selectedChannel.privateCallConfirmed === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.privateCallConfirmed === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.dataCallConfirmed")}<select id="channel-editor-data-confirmed"><option value="Off" ${selectedChannel.dataCallConfirmed === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.dataCallConfirmed === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.emergencyAlarmAck")}<select id="channel-editor-emergency-ack"><option value="Off" ${selectedChannel.emergencyAlarmAck === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.emergencyAlarmAck === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.compressedUdp")}<select id="channel-editor-compressed-udp"><option value="Off" ${selectedChannel.compressedUdpDataHeader === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.compressedUdpDataHeader === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.displayPttId")}<select id="channel-editor-display-ptt"><option value="Off" ${selectedChannel.displayPttId === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.displayPttId === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.receiveGps")}<select id="channel-editor-receive-gps"><option value="Off" ${selectedChannel.receiveGpsInfo === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.receiveGpsInfo === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.sendGps")}<select id="channel-editor-send-gps"><option value="Off" ${selectedChannel.sendGpsInfo === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.sendGpsInfo === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.reverseBurst")}<select id="channel-editor-reverse-burst"><option value="Off" ${selectedChannel.reverseBurst === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.reverseBurst === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.dcdmSwitch")}<select id="channel-editor-dcdm"><option value="Off" ${selectedChannel.dcdmSwitch === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.dcdmSwitch === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.leaderMs")}<select id="channel-editor-leader-ms"><option value="Off" ${selectedChannel.leaderMs === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.leaderMs === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.allowInterrupt")}<select id="channel-editor-allow-interrupt"><option value="Off" ${selectedChannel.allowInterrupt === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.allowInterrupt === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 1 })}<select id="channel-editor-decode1"><option value="Off" ${selectedChannel.decode1 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode1 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 2 })}<select id="channel-editor-decode2"><option value="Off" ${selectedChannel.decode2 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode2 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 3 })}<select id="channel-editor-decode3"><option value="Off" ${selectedChannel.decode3 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode3 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 4 })}<select id="channel-editor-decode4"><option value="Off" ${selectedChannel.decode4 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode4 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 5 })}<select id="channel-editor-decode5"><option value="Off" ${selectedChannel.decode5 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode5 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 6 })}<select id="channel-editor-decode6"><option value="Off" ${selectedChannel.decode6 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode6 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 7 })}<select id="channel-editor-decode7"><option value="Off" ${selectedChannel.decode7 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode7 === "On" ? "selected" : ""}>On</option></select></label>
              <label>${t("editor.channels.decode", { n: 8 })}<select id="channel-editor-decode8"><option value="Off" ${selectedChannel.decode8 === "Off" ? "selected" : ""}>Off</option><option value="On" ${selectedChannel.decode8 === "On" ? "selected" : ""}>On</option></select></label>
            </div>
            </section>
            </div>
            <div class="form-actions">
              <button class="button tiny" id="channel-editor-delete">${t("editor.channels.delete")}</button>
            </div>
          `
              : `<p class="muted-text">${t("editor.channels.selectToEdit")}</p>`
          }
        </div>
      </div>
      <section class="bulk-card">
        <details id="bulk-editor-card" ${channelState.bulkExpanded ? "open" : ""}>
          <summary>
            <span>${t("editor.channels.bulkHeading")}</span>
            <span class="muted-text">${t("editor.channels.bulkSummary", { filtered: filteredChannels.length, selected: channelState.bulkSelectionIds.length })}</span>
          </summary>
          <div class="bulkbar">
            <select id="bulk-target">
              <option value="filtered" ${channelState.bulkTarget === "filtered" ? "selected" : ""}>${t("editor.channels.bulkFiltered", { count: filteredChannels.length })}</option>
              <option value="selected" ${channelState.bulkTarget === "selected" ? "selected" : ""}>${t("editor.channels.bulkSelected", { count: channelState.bulkSelectionIds.length })}</option>
            </select>
            <button class="button ghost tiny" id="bulk-select-filtered">${t("editor.channels.bulkSelectFiltered", { count: filteredChannels.length })}</button>
            <button class="button ghost tiny" id="bulk-clear-selection" ${channelState.bulkSelectionIds.length === 0 ? "disabled" : ""}>${t("editor.channels.bulkClearSelected")}</button>
            <select id="bulk-mode">
              <option value="">${t("editor.channels.bulkModeUnchanged")}</option>
              <option value="Analog" ${channelState.bulkMode === "Analog" ? "selected" : ""}>Analog</option>
              <option value="Digital" ${channelState.bulkMode === "Digital" ? "selected" : ""}>Digital</option>
            </select>
            <select id="bulk-power">
              <option value="">${t("editor.channels.bulkPowerUnchanged")}</option>
              <option value="Low" ${channelState.bulkPower === "Low" ? "selected" : ""}>Low</option>
              <option value="High" ${channelState.bulkPower === "High" ? "selected" : ""}>High</option>
            </select>
            <select id="bulk-bandwidth">
              <option value="">${t("editor.channels.bulkBandwidthUnchanged")}</option>
              <option value="12.5" ${channelState.bulkBandwidth === "12.5" ? "selected" : ""}>12.5 kHz</option>
              <option value="20" ${channelState.bulkBandwidth === "20" ? "selected" : ""}>20 kHz</option>
              <option value="25" ${channelState.bulkBandwidth === "25" ? "selected" : ""}>25 kHz</option>
            </select>
            <select id="bulk-slot">
              <option value="">${t("editor.channels.bulkSlotUnchanged")}</option>
              <option value="1" ${channelState.bulkRepeaterSlot === "1" ? "selected" : ""}>TS1</option>
              <option value="2" ${channelState.bulkRepeaterSlot === "2" ? "selected" : ""}>TS2</option>
            </select>
            <input id="bulk-color-code" type="number" min="0" max="15" step="1" placeholder="${t("editor.channels.bulkColorCodePlaceholder")}" value="${escapeHtml(channelState.bulkColorCode)}" />
            <input id="bulk-rx-frequency" type="number" min="100" max="1000" step="0.00001" placeholder="${t("editor.channels.bulkRxPlaceholder")}" value="${escapeHtml(channelState.bulkRxFrequencyMHz)}" />
            <input id="bulk-tx-offset" type="number" min="-100" max="100" step="0.00001" placeholder="${t("editor.channels.bulkShiftPlaceholder")}" value="${escapeHtml(channelState.bulkTxOffsetMHz)}" />
            <button class="button tiny" id="apply-bulk">${t("common.apply")}</button>
            <small class="muted-text">${t("editor.channels.bulkApplyHelp")}</small>
            <small class="muted-text">${t("editor.channels.bulkSelectedCount", { selected: selectedInFilterCount, total: filteredChannels.length })}</small>
          </div>
        </details>
      </section>
    `;
  }

  return `<p class="muted-text">${t("editor.tabUnavailable")}</p>`;
}

export function bindFileInputs(target: HTMLElement, store: EditorStore): void {
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

export function bindTopActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
): void {
  target.querySelector<HTMLButtonElement>("#export-btn")?.addEventListener("click", () => {
    const snapshot = store.getState();
    if (!snapshot.document) {
      return;
    }
    const bytes = store.exportBytes();
    if (!bytes) {
      return;
    }
    const rdtBytes = ensureRdtBytes(snapshot.document, bytes);
    const outputName = toRdtOutputName(snapshot.document.outputFileName || snapshot.document.fileName);
    downloadBytes(outputName, rdtBytes);
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

  target.querySelector<HTMLButtonElement>("#callsign-back-home-btn")?.addEventListener("click", async () => {
    if (state.isDirty) {
      const confirmed = await showConfirm({
        title: t("editor.confirm.discardTitle"),
        message: t("editor.confirm.discardMessage"),
        confirmLabel: t("editor.confirm.discardConfirm"),
        danger: true,
      });
      if (!confirmed) {
        return;
      }
    }

    if (uiState.radioTransport?.isConnected()) {
      try {
        await uiState.radioTransport.disconnect();
      } catch {
        // Ignore disconnect failures while returning home.
      }
    }

    uiState.landingView = "home";
    uiState.activeTab = "basic";
    uiState.activeGuideModal = null;
    uiState.selectedZoneId = null;
    uiState.selectedChannelId = null;
    uiState.lastRenderedTab = null;
    uiState.radioTransport = null;
    uiState.radioStatusMessage = t("editor.status.notConnected");
    uiState.radioBusy = false;
    uiState.radioProgressPercent = 0;
    uiState.radioProgressLabel = t("editor.progress.noTransfer");
    uiState.radioProgressVisible = false;

    channelState.query = "";
    channelState.modeFilter = "all";
    channelState.bulkExpanded = false;
    channelState.bulkTarget = "filtered";
    channelState.bulkSelectionIds = [];
    channelState.bulkMode = "";
    channelState.bulkPower = "";
    channelState.bulkBandwidth = "";
    channelState.bulkRepeaterSlot = "";
    channelState.bulkColorCode = "";
    channelState.bulkRxFrequencyMHz = "";
    channelState.bulkTxOffsetMHz = "";

    store.reset();
  });
}

export function bindTabs(
  target: HTMLElement,
  uiState: UiState,
  state: AppState,
  store: EditorStore,
  channelState: ChannelPanelState,
  renderState: RenderStateFn,
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
        key === "dtmf" ||
        key === "one-touch" ||
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

export function bindActiveTab(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
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

      return panel?.querySelector(".field-error:not(:empty)") === null;
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

    radioNameInput?.addEventListener("change", commit);
    radioIdInput?.addEventListener("change", commit);
    voxSensitivityInput?.addEventListener("change", commit);
    txPreambleDurationInput?.addEventListener("change", commit);
    rxLowBatteryIntervalInput?.addEventListener("change", commit);
    backlightTimeoutSelect?.addEventListener("change", commit);
    keypadAutoLockSelect?.addEventListener("change", commit);
    bootLine1Input?.addEventListener("change", commit);
    bootLine2Input?.addEventListener("change", commit);
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
    if (!state.document) {
      return;
    }
    const documentState = state.document;

    for (const input of panel.querySelectorAll<HTMLInputElement>("[data-enhanced-key]")) {
      input.addEventListener("change", () => {
        const index = Number.parseInt(input.dataset.enhancedKey ?? "", 10);
        if (Number.isNaN(index)) {
          return;
        }
        const next = [...documentState.privacySettings.enhancedKeys];
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
        const next = [...documentState.privacySettings.basicKeys];
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

  if (uiState.activeTab === "dtmf") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-number-key-slot]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.numberKeySlot ?? "", 10);
        if (Number.isNaN(slot) || slot < 0 || slot > 9) {
          return;
        }
        const contactId = Number.parseInt(select.value, 10);
        store.updateNumberKey(slot, Number.isNaN(contactId) ? undefined : contactId);
      });
    }

    return;
  }

  if (uiState.activeTab === "one-touch") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-one-touch-mode]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.oneTouchMode ?? "", 10);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) {
          return;
        }
        const mode = select.value;
        if (mode === "None" || mode === "Digital" || mode === "Analog") {
          store.updateOneTouchAction(slot, { mode });
        }
      });
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-one-touch-call-type]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.oneTouchCallType ?? "", 10);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) {
          return;
        }
        const callType = select.value;
        if (callType === "Call" || callType === "Text Message") {
          store.updateOneTouchAction(slot, { callType });
        }
      });
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-one-touch-contact]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.oneTouchContact ?? "", 10);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) {
          return;
        }
        const contactId = Number.parseInt(select.value, 10);
        store.updateOneTouchAction(slot, { contactId: Number.isNaN(contactId) ? undefined : contactId });
      });
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-one-touch-text-message]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.oneTouchTextMessage ?? "", 10);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) {
          return;
        }
        const textMessageId = Number.parseInt(select.value, 10);
        store.updateOneTouchAction(slot, { textMessageId: Number.isNaN(textMessageId) ? undefined : textMessageId });
      });
    }

    for (const select of panel.querySelectorAll<HTMLSelectElement>("[data-one-touch-dtmf-system]")) {
      select.addEventListener("change", () => {
        const slot = Number.parseInt(select.dataset.oneTouchDtmfSystem ?? "", 10);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) {
          return;
        }
        const dtmfSystem = select.value;
        if (dtmfSystem === "DTMF-1" || dtmfSystem === "DTMF-2" || dtmfSystem === "DTMF-3" || dtmfSystem === "DTMF-4") {
          store.updateOneTouchAction(slot, { dtmfSystem });
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

    const ensureRadioTransport = async (): Promise<BrowserRadioTransport> => {
      const capabilities = detectBrowserRadioCapabilities();
      if (!capabilities.supported) {
        throw new Error(t("radio.error.webusbNotReady", { blockers: capabilities.blockers.join("\n") }));
      }

      const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
      if (!transport) {
        throw new Error(t("radio.error.initFailed"));
      }

      uiState.radioTransport = transport;
      if (!transport.isConnected()) {
        const device = await transport.connect();
        const label = [device.manufacturerName, device.productName]
          .filter((item) => Boolean(item))
          .join(" ")
          .trim();
        uiState.radioStatusMessage = t("editor.status.connectedDetail", {
          label: label || t("radio.status.usbRadio"),
          vid: device.vendorId.toString(16).padStart(4, "0"),
          pid: device.productId.toString(16).padStart(4, "0"),
        });
      }

      return transport;
    };

    const safeRebootRadio = async (transport: BrowserRadioTransport): Promise<void> => {
      if (typeof transport.rebootRadio === "function") {
        await transport.rebootRadio();
      }
    };

    panel.querySelector<HTMLButtonElement>("#radio-transfer-connect")?.addEventListener("click", async () => {
      const isConnected = uiState.radioTransport?.isConnected() ?? false;

      if (isConnected && uiState.radioTransport) {
        uiState.radioBusy = true;
        renderState(target, store, store.getState(), channelState, uiState);
        try {
          await uiState.radioTransport.disconnect();
          uiState.radioStatusMessage = t("editor.status.disconnected");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Disconnect failed.";
          uiState.radioStatusMessage = t("editor.status.disconnectFailed", { message });
        } finally {
          uiState.radioBusy = false;
          renderState(target, store, store.getState(), channelState, uiState);
        }
        return;
      }

      uiState.radioBusy = true;
      renderState(target, store, store.getState(), channelState, uiState);

      try {
        const transport = await ensureRadioTransport();
        showToast({
          type: "success",
          message: t("editor.toast.connected", { device: uiState.radioStatusMessage.split(": ")[1] || t("radio.status.usbRadio") }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "WebUSB connection failed.";
        uiState.radioStatusMessage = t("editor.status.connectFailed", { message });
        showToast({ type: "error", message: t("editor.status.connectFailed", { message }) });
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    panel.querySelector<HTMLButtonElement>("#radio-transfer-read")?.addEventListener("click", async () => {
      if (!uiState.radioTransport || !uiState.radioTransport.isConnected()) {
        showToast({ type: "warning", message: t("editor.toast.connectFirst") });
        return;
      }

      const applyProgress = (progress: BrowserTransferProgress): void => {
        setRadioProgress(uiState, progress);
        syncRadioProgressUi(target, uiState);
      };

      uiState.radioBusy = true;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = t("editor.progress.startingRead");
      renderState(target, store, store.getState(), channelState, uiState);
      try {
        const bytes = await uiState.radioTransport.readCodeplug(applyProgress);
        store.load("radio-read.bin", bytes);
        const loadedState = store.getState();
        if (!loadedState.document) {
          throw new Error(loadedState.importError ?? t("editor.error.readParseFailed"));
        }

        // Codeplug payload does not contain device metadata (maker, MCU, unique
        // device ID). Query the radio directly so the Basic tab can show it.
        if (uiState.radioTransport.readDeviceInfo) {
          uiState.radioProgressLabel = t("editor.progress.readingDeviceInfo");
          syncRadioProgressUi(target, uiState);
          try {
            const deviceInfo = await uiState.radioTransport.readDeviceInfo();
            store.applyRadioDeviceInfo(deviceInfo);
          } catch (deviceInfoError) {
            console.debug("Device info read failed: ", deviceInfoError);
          }
        }

        uiState.radioStatusMessage = t("editor.msg.readComplete", { bytes: bytes.byteLength });
        uiState.radioProgressPercent = 100;
        uiState.radioProgressLabel = t("editor.progress.readComplete");
        showToast({ type: "success", message: t("editor.msg.readComplete", { bytes: bytes.byteLength }) });
        await safeRebootRadio(uiState.radioTransport);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Read failed.";
        uiState.radioStatusMessage = t("editor.msg.readFailed", { message });
        uiState.radioProgressVisible = false;
        uiState.radioProgressPercent = 0;
        uiState.radioProgressLabel = "";
        showToast({ type: "error", message: t("editor.msg.readFailed", { message }) });
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    panel.querySelector<HTMLButtonElement>("#radio-transfer-write")?.addEventListener("click", async () => {
      if (!uiState.radioTransport || !uiState.radioTransport.isConnected()) {
        showToast({ type: "warning", message: t("editor.toast.connectFirst") });
        return;
      }

      const connectedDevice = uiState.radioTransport.getConnectedDevice();
      const connectedModel = normalizeModelToken(
        [connectedDevice?.manufacturerName, connectedDevice?.productName].filter((item) => Boolean(item)).join(" "),
      );
      const codeplugModel = normalizeModelToken(state.document?.model);
      if (connectedModel && codeplugModel && connectedModel !== codeplugModel) {
        const confirmed = await showConfirm({
          title: t("editor.confirm.modelMismatchTitle"),
          message: t("editor.confirm.modelMismatchMessage", { connected: connectedModel, codeplug: codeplugModel }),
          confirmLabel: t("editor.confirm.modelMismatchConfirm"),
          danger: true,
        });
        if (!confirmed) {
          return;
        }
      }

      const bytes = store.exportBytes();
      if (!bytes) {
        showToast({ type: "warning", message: t("editor.toast.nothingToWrite") });
        return;
      }

      const applyProgress = (progress: BrowserTransferProgress): void => {
        setRadioProgress(uiState, progress);
        syncRadioProgressUi(target, uiState);
      };

      uiState.radioBusy = true;
      uiState.radioProgressVisible = true;
      uiState.radioProgressPercent = 0;
      uiState.radioProgressLabel = t("editor.progress.startingWrite");
      renderState(target, store, store.getState(), channelState, uiState);
      try {
        await uiState.radioTransport.writeCodeplug(bytes, applyProgress);
        uiState.radioStatusMessage = t("editor.msg.writeComplete", { bytes: bytes.byteLength });
        uiState.radioProgressPercent = 100;
        uiState.radioProgressLabel = t("editor.progress.writeComplete");
        showToast({ type: "success", message: t("editor.msg.writeComplete", { bytes: bytes.byteLength }) });
        await safeRebootRadio(uiState.radioTransport);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Write failed.";
        uiState.radioStatusMessage = t("editor.msg.writeFailed", { message });
        uiState.radioProgressVisible = false;
        uiState.radioProgressPercent = 0;
        uiState.radioProgressLabel = "";
        showToast({ type: "error", message: t("editor.msg.writeFailed", { message }) });
      } finally {
        uiState.radioBusy = false;
        renderState(target, store, store.getState(), channelState, uiState);
      }
    });

    panel.querySelector<HTMLButtonElement>("#radio-transfer-setup-guide-btn")?.addEventListener("click", () => {
      uiState.activeGuideModal = "radio-transfer";
      renderState(target, store, store.getState(), channelState, uiState);
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
      nameInput.addEventListener("change", () => {
        if (uiState.selectedZoneId) {
          const existingIds = selectedZone?.channelIds ?? [];
          store.updateZone(uiState.selectedZoneId, nameInput.value, existingIds);
        }
      });
    }

    panel.querySelector<HTMLButtonElement>("#zone-edit-channels")?.addEventListener("click", async () => {
      if (!selectedZone) {
        return;
      }
      const result = await showMembershipPicker({
        title: t("editor.picker.editChannelsTitle", { name: selectedZone.name }),
        items: (state.document?.channels ?? []).map((channel) => ({ id: channel.id, label: `#${channel.id} ${channel.name}` })),
        selectedIds: selectedZone.channelIds,
        maxSelection: 16,
        itemNoun: t("dialog.noun.channels"),
        searchPlaceholder: t("editor.picker.searchChannels"),
      });
      if (result) {
        updateZoneChannels(result);
      }
    });

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

  if (uiState.activeTab === "group-lists") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    panel.querySelector<HTMLButtonElement>("#add-group-list")?.addEventListener("click", () => {
      store.addGroupList();
      const updated = store.getState().document;
      if (updated && updated.groupLists.length > 0) {
        uiState.selectedGroupListId = updated.groupLists[updated.groupLists.length - 1].id;
      }
      store.notifySubscribers();
    });

    for (const selectButton of panel.querySelectorAll<HTMLElement>("[data-group-list-select]")) {
      selectButton.addEventListener("click", () => {
        const id = Number.parseInt(selectButton.dataset.groupListSelect ?? "", 10);
        if (!Number.isNaN(id)) {
          uiState.selectedGroupListId = id;
          store.notifySubscribers();
        }
      });
    }

    const selectedGroupListId = uiState.selectedGroupListId;
    const selectedGroupList = selectedGroupListId && state.document
      ? state.document.groupLists.find((item) => item.id === selectedGroupListId)
      : undefined;
    const groupListError = panel.querySelector<HTMLElement>("#group-list-editor-error");

    if (!selectedGroupList) {
      return;
    }

    const updateGroupListContacts = (nextContactIds: number[]): void => {
      store.updateGroupListContacts(selectedGroupList.id, nextContactIds);
      if (groupListError) {
        groupListError.textContent = "";
      }
    };

    const nameInput = panel.querySelector<HTMLInputElement>(`[data-group-list-name="${selectedGroupList.id}"]`);
    if (nameInput) {
      nameInput.addEventListener("change", () => {
        store.updateGroupListName(selectedGroupList.id, nameInput.value);
      });
    }

    panel.querySelector<HTMLButtonElement>("#group-list-edit-contacts")?.addEventListener("click", async () => {
      const result = await showMembershipPicker({
        title: t("editor.picker.editContactsTitle", { name: selectedGroupList.name }),
        items: (state.document?.contacts ?? []).map((contact) => ({ id: contact.id, label: `#${contact.id} ${contact.name}` })),
        selectedIds: selectedGroupList.contactIds ?? [],
        maxSelection: 32,
        itemNoun: t("dialog.noun.contacts"),
        searchPlaceholder: t("editor.picker.searchContacts"),
      });
      if (result) {
        updateGroupListContacts(result);
      }
    });

    for (const moveUp of panel.querySelectorAll<HTMLButtonElement>("[data-group-list-contact-up]")) {
      moveUp.addEventListener("click", () => {
        const contactId = Number.parseInt(moveUp.dataset.groupListContactUp ?? "", 10);
        if (Number.isNaN(contactId)) {
          return;
        }
        const next = [...(selectedGroupList.contactIds ?? [])];
        const index = next.indexOf(contactId);
        if (index <= 0) {
          return;
        }
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        updateGroupListContacts(next);
      });
    }

    for (const moveDown of panel.querySelectorAll<HTMLButtonElement>("[data-group-list-contact-down]")) {
      moveDown.addEventListener("click", () => {
        const contactId = Number.parseInt(moveDown.dataset.groupListContactDown ?? "", 10);
        if (Number.isNaN(contactId)) {
          return;
        }
        const next = [...(selectedGroupList.contactIds ?? [])];
        const index = next.indexOf(contactId);
        if (index < 0 || index >= next.length - 1) {
          return;
        }
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        updateGroupListContacts(next);
      });
    }

    for (const removeButton of panel.querySelectorAll<HTMLButtonElement>("[data-group-list-contact-remove]")) {
      removeButton.addEventListener("click", () => {
        const contactId = Number.parseInt(removeButton.dataset.groupListContactRemove ?? "", 10);
        if (Number.isNaN(contactId)) {
          return;
        }
        updateGroupListContacts((selectedGroupList.contactIds ?? []).filter((id) => id !== contactId));
      });
    }

    const deleteButton = panel.querySelector<HTMLButtonElement>("#group-list-editor-delete");
    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        const confirmed = await showConfirm({
          title: "Delete Group List",
          message: `Delete group list \"${selectedGroupList.name}\"?`,
          confirmLabel: "Delete",
          danger: true,
        });
        if (!confirmed) {
          return;
        }

        store.removeGroupList(selectedGroupList.id);
        uiState.selectedGroupListId = null;
      });
    }

    return;
  }

  if (uiState.activeTab === "scan-lists") {
    const panel = target.querySelector<HTMLElement>("#active-tab-panel");
    if (!panel) {
      return;
    }

    // Handle scan list selection
    for (const selectButton of panel.querySelectorAll<HTMLElement>("[data-scan-list-select]")) {
      selectButton.addEventListener("click", () => {
        const id = Number.parseInt(selectButton.dataset.scanListSelect ?? "", 10);
        if (!Number.isNaN(id)) {
          uiState.selectedScanListId = id;
          store.notifySubscribers();
        }
      });
    }

    // Handle add scan list
    panel.querySelector<HTMLButtonElement>("#add-scan-list")?.addEventListener("click", () => {
      store.addScanList();
      const updated = store.getState().document;
      if (updated && updated.scanLists.length > 0) {
        uiState.selectedScanListId = updated.scanLists[updated.scanLists.length - 1].id;
      }
      store.notifySubscribers();
    });

    // Find selected scan list
    const selectedScanListId = uiState.selectedScanListId;
    const selectedScanList = selectedScanListId && state.document
      ? state.document.scanLists.find((item) => item.id === selectedScanListId)
      : undefined;
    const scanListError = panel.querySelector<HTMLElement>("#scan-list-editor-error");

    if (!selectedScanList) {
      return;
    }

    const updateScanListChannels = (nextChannelIds: number[]): void => {
      store.updateScanListChannels(selectedScanList.id, nextChannelIds);
      if (scanListError) {
        scanListError.textContent = "";
      }
    };

    // Handle name input
    const nameInput = panel.querySelector<HTMLInputElement>(`[data-scan-list-name="${selectedScanList.id}"]`);
    if (nameInput) {
      nameInput.addEventListener("change", () => {
        store.updateScanListName(selectedScanList.id, nameInput.value);
      });
    }

    // Handle signalling hold time
    const signalingInput = panel.querySelector<HTMLInputElement>(`[data-scan-list-signalling-time="${selectedScanList.id}"]`);
    if (signalingInput) {
      signalingInput.addEventListener("change", () => {
        const ms = Number.parseInt(signalingInput.value, 10);
        if (!Number.isNaN(ms)) {
          store.updateScanListSignalingHoldTime(selectedScanList.id, ms);
        }
      });
    }

    // Handle priority sample time
    const prioritySampleInput = panel.querySelector<HTMLInputElement>(`[data-scan-list-priority-sample-time="${selectedScanList.id}"]`);
    if (prioritySampleInput) {
      prioritySampleInput.addEventListener("change", () => {
        const ms = Number.parseInt(prioritySampleInput.value, 10);
        if (!Number.isNaN(ms)) {
          store.updateScanListPrioritySampleTime(selectedScanList.id, ms);
        }
      });
    }

    // Handle priority channel 1
    const priority1Select = panel.querySelector<HTMLSelectElement>(`[data-scan-list-priority-channel-1="${selectedScanList.id}"]`);
    if (priority1Select) {
      priority1Select.addEventListener("change", () => {
        const channelId = priority1Select.value ? Number.parseInt(priority1Select.value, 10) : undefined;
        if (!channelId || !Number.isNaN(channelId)) {
          store.updateScanListPriorityChannel1(selectedScanList.id, channelId);
          store.notifySubscribers();
        }
      });
    }

    // Handle priority channel 2
    const priority2Select = panel.querySelector<HTMLSelectElement>(`[data-scan-list-priority-channel-2="${selectedScanList.id}"]`);
    if (priority2Select) {
      priority2Select.addEventListener("change", () => {
        const channelId = priority2Select.value ? Number.parseInt(priority2Select.value, 10) : undefined;
        if (!channelId || !Number.isNaN(channelId)) {
          store.updateScanListPriorityChannel2(selectedScanList.id, channelId);
        }
      });
    }

    // Handle Tx mode
    const txModeSelect = panel.querySelector<HTMLSelectElement>(`[data-scan-list-tx-mode="${selectedScanList.id}"]`);
    if (txModeSelect) {
      txModeSelect.addEventListener("change", () => {
        const mode = txModeSelect.value as "Selected" | "Last Active Channel";
        store.updateScanListTxDesignatedChannelMode(selectedScanList.id, mode);
        store.notifySubscribers();
      });
    }

    // Handle Tx channel (only shown if mode is "Selected")
    const txChannelSelect = panel.querySelector<HTMLSelectElement>(`[data-scan-list-tx-channel="${selectedScanList.id}"]`);
    if (txChannelSelect) {
      txChannelSelect.addEventListener("change", () => {
        const channelId = txChannelSelect.value ? Number.parseInt(txChannelSelect.value, 10) : undefined;
        if (!channelId || !Number.isNaN(channelId)) {
          store.updateScanListTxDesignatedChannel(selectedScanList.id, channelId);
        }
      });
    }

    // Handle channel membership editing via modal picker
    panel.querySelector<HTMLButtonElement>("#scan-list-edit-channels")?.addEventListener("click", async () => {
      const result = await showMembershipPicker({
        title: t("editor.picker.editChannelsTitle", { name: selectedScanList.name }),
        items: (state.document?.channels ?? []).map((channel) => ({ id: channel.id, label: `#${channel.id} ${channel.name}` })),
        selectedIds: selectedScanList.channelIds ?? [],
        maxSelection: 31,
        itemNoun: t("dialog.noun.channels"),
        searchPlaceholder: t("editor.picker.searchChannels"),
      });
      if (result) {
        updateScanListChannels(result);
      }
    });

    for (const moveUp of panel.querySelectorAll<HTMLButtonElement>("[data-scan-list-channel-up]")) {
      moveUp.addEventListener("click", () => {
        const channelId = Number.parseInt(moveUp.dataset.scanListChannelUp ?? "", 10);
        if (Number.isNaN(channelId)) {
          return;
        }
        const next = [...(selectedScanList.channelIds ?? [])];
        const index = next.indexOf(channelId);
        if (index <= 0) {
          return;
        }
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        updateScanListChannels(next);
      });
    }

    for (const moveDown of panel.querySelectorAll<HTMLButtonElement>("[data-scan-list-channel-down]")) {
      moveDown.addEventListener("click", () => {
        const channelId = Number.parseInt(moveDown.dataset.scanListChannelDown ?? "", 10);
        if (Number.isNaN(channelId)) {
          return;
        }
        const next = [...(selectedScanList.channelIds ?? [])];
        const index = next.indexOf(channelId);
        if (index < 0 || index >= next.length - 1) {
          return;
        }
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        updateScanListChannels(next);
      });
    }

    for (const removeButton of panel.querySelectorAll<HTMLButtonElement>("[data-scan-list-channel-remove]")) {
      removeButton.addEventListener("click", () => {
        const channelId = Number.parseInt(removeButton.dataset.scanListChannelRemove ?? "", 10);
        if (Number.isNaN(channelId)) {
          return;
        }
        updateScanListChannels((selectedScanList.channelIds ?? []).filter((id) => id !== channelId));
      });
    }

    // Handle delete
    const deleteButton = panel.querySelector<HTMLButtonElement>("#scan-list-editor-delete");
    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        if (selectedScanList) {
          const confirmed = await showConfirm({
            title: "Delete Scan List",
            message: `Delete scan list \"${selectedScanList.name}\"?`,
            confirmLabel: "Delete",
            danger: true,
          });
          if (!confirmed) {
            return;
          }
          store.removeScanList(selectedScanList.id);
          uiState.selectedScanListId = null;
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

  for (const toggle of panel.querySelectorAll<HTMLInputElement>("[data-channel-bulk-toggle]")) {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    toggle.addEventListener("change", () => {
      const id = Number.parseInt(toggle.dataset.channelBulkToggle ?? "", 10);
      if (Number.isNaN(id)) {
        return;
      }
      if (toggle.checked) {
        if (!channelState.bulkSelectionIds.includes(id)) {
          channelState.bulkSelectionIds = [...channelState.bulkSelectionIds, id];
        }
      } else {
        channelState.bulkSelectionIds = channelState.bulkSelectionIds.filter((itemId) => itemId !== id);
      }
      renderState(target, store, store.getState(), channelState, uiState);
    });
  }

  // Editor fields
  const nameInput = panel.querySelector<HTMLInputElement>("#channel-editor-name");
  const rxInput = panel.querySelector<HTMLInputElement>("#channel-editor-rx");
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

      if (Object.keys(updates).length > 0) {
        store.updateChannel(uiState.selectedChannelId, updates);
      }
    }
  };

  nameInput?.addEventListener("change", commitChannelChange);
  rxInput?.addEventListener("change", commitChannelChange);
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
  panel.querySelector<HTMLDetailsElement>("#bulk-editor-card")?.addEventListener("toggle", (event) => {
    channelState.bulkExpanded = (event.currentTarget as HTMLDetailsElement).open;
  });

  panel.querySelector<HTMLSelectElement>("#bulk-target")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.bulkTarget = value === "selected" ? "selected" : "filtered";
  });

  panel.querySelector<HTMLButtonElement>("#bulk-select-filtered")?.addEventListener("click", () => {
    channelState.bulkSelectionIds = filteredChannels.map((channel) => channel.id);
    renderState(target, store, store.getState(), channelState, uiState);
  });

  panel.querySelector<HTMLButtonElement>("#bulk-clear-selection")?.addEventListener("click", () => {
    channelState.bulkSelectionIds = [];
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

  panel.querySelector<HTMLSelectElement>("#bulk-bandwidth")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.bulkBandwidth = value === "20" || value === "25" || value === "12.5" ? value : "";
  });

  panel.querySelector<HTMLSelectElement>("#bulk-slot")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    channelState.bulkRepeaterSlot = value === "1" || value === "2" ? value : "";
  });

  panel.querySelector<HTMLInputElement>("#bulk-color-code")?.addEventListener("input", (event) => {
    channelState.bulkColorCode = (event.currentTarget as HTMLInputElement).value;
  });

  panel.querySelector<HTMLInputElement>("#bulk-rx-frequency")?.addEventListener("input", (event) => {
    channelState.bulkRxFrequencyMHz = (event.currentTarget as HTMLInputElement).value;
  });

  panel.querySelector<HTMLInputElement>("#bulk-tx-offset")?.addEventListener("input", (event) => {
    channelState.bulkTxOffsetMHz = (event.currentTarget as HTMLInputElement).value;
  });

  panel.querySelector<HTMLButtonElement>("#apply-bulk")?.addEventListener("click", () => {
    const patch: {
      channelMode?: "Analog" | "Digital";
      power?: "Low" | "High";
      colorCode?: number;
      repeaterSlot?: 1 | 2;
      bandwidthKhz?: "12.5" | "20" | "25";
      rxFrequencyMHz?: number;
      txOffsetMHz?: number;
    } = {};
    if (channelState.bulkMode) {
      patch.channelMode = channelState.bulkMode;
    }
    if (channelState.bulkPower) {
      patch.power = channelState.bulkPower;
    }
    if (channelState.bulkBandwidth) {
      patch.bandwidthKhz = channelState.bulkBandwidth;
    }
    if (channelState.bulkRepeaterSlot) {
      patch.repeaterSlot = channelState.bulkRepeaterSlot === "2" ? 2 : 1;
    }
    if (channelState.bulkColorCode.trim().length > 0) {
      const parsed = Number.parseInt(channelState.bulkColorCode, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 15) {
        showToast({ type: "error", message: "Color Code must be between 0 and 15." });
        return;
      }
      patch.colorCode = parsed;
    }

    const hasBulkRx = channelState.bulkRxFrequencyMHz.trim().length > 0;
    const hasBulkOffset = channelState.bulkTxOffsetMHz.trim().length > 0;

    if (hasBulkRx) {
      const parsed = Number.parseFloat(channelState.bulkRxFrequencyMHz);
      if (Number.isNaN(parsed) || parsed < 100 || parsed > 1000) {
        showToast({ type: "error", message: "RX frequency must be between 100 and 1000 MHz." });
        return;
      }
      patch.rxFrequencyMHz = parsed;
    }

    if (hasBulkOffset) {
      const parsed = Number.parseFloat(channelState.bulkTxOffsetMHz);
      if (Number.isNaN(parsed) || parsed < -100 || parsed > 100) {
        showToast({ type: "error", message: "Shift must be between -100 and +100 MHz." });
        return;
      }
      patch.txOffsetMHz = parsed;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    const selectedChannelIds = channelState.bulkTarget === "selected"
      ? channelState.bulkSelectionIds.filter((channelId) => document.channels.some((channel) => channel.id === channelId))
      : filteredChannels.map((channel) => channel.id);

    if (selectedChannelIds.length === 0) {
      showToast({ type: "warning", message: channelState.bulkTarget === "selected" ? "Select at least one channel for bulk update." : "No channels match current filters." });
      return;
    }

    channelState.bulkRxFrequencyMHz = "";
    channelState.bulkTxOffsetMHz = "";

    store.bulkUpdateChannels(
      selectedChannelIds,
      patch,
    );
  });
}
