import type { AppState, EditorStore } from "../state/store";
import {
  createBrowserRadioTransport,
  detectBrowserRadioCapabilities,
  type BrowserRadioTransport,
  type BrowserRtcSyncPayload,
} from "../transport/browserRadio";
import type { ChannelPanelState, UiState } from "./uiTypes";
import { escapeHtml, TIME_ZONE_OPTIONS } from "./uiHelpers";
import { showToast } from "./dialog";

type RenderStateFn = (
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
) => void;

export function renderTimeSyncWorkflow(uiState: UiState): string {
  ensureDefaultTimeSyncTimeZone(uiState);
  const canSync = uiState.riskAccepted && !uiState.timeSyncBusy;

  return `
    <main class="layout">
      <section class="hero card">
        <h1>Transceiver Date / Time Sync</h1>
        <p>Sync radio date, time, and selected timezone to match your current machine clock.</p>
        <div class="actions">
          <button id="time-sync-back-home-btn" class="button ghost">Back To Homepage</button>
        </div>
      </section>

      <section class="card">
        <h2>1. Select Timezone</h2>
        <p class="muted-text">Timezone defaults to your current client timezone and can be changed before sync.</p>
        <label>
          Timezone
          <select id="time-sync-workflow-timezone" ${canSync ? "" : "disabled"}>
            ${TIME_ZONE_OPTIONS.map((zone) => `<option value="${zone}" ${uiState.timeSyncTimeZone === zone ? "selected" : ""}>${zone}</option>`).join("")}
          </select>
        </label>
      </section>

      <section class="card">
        <h2>2. Sync Date And Time</h2>
        <p class="muted-text">Connect to your radio and apply the current date/time computed for the selected timezone.</p>
        <button id="time-sync-workflow-apply-btn" class="button callsign-action-btn" ${canSync ? "" : "disabled"}>Sync Date / Time To Radio</button>
      </section>

      <section class="card">
        <h2>Operation Status</h2>
        <p class="muted-text" id="time-sync-status">Status: ${escapeHtml(uiState.timeSyncStatusMessage)}</p>
      </section>
    </main>
  `;
}

export function bindTimeSyncWorkflowActions(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
  renderState: RenderStateFn,
): void {
  ensureDefaultTimeSyncTimeZone(uiState);

  target.querySelector<HTMLButtonElement>("#time-sync-back-home-btn")?.addEventListener("click", () => {
    uiState.landingView = "home";
    renderState(target, store, store.getState(), channelState, uiState);
  });

  target.querySelector<HTMLSelectElement>("#time-sync-workflow-timezone")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    uiState.timeSyncTimeZone = TIME_ZONE_OPTIONS.includes(value) ? value : "UTC+0:00";
  });

  const ensureRadioTransport = async (): Promise<BrowserRadioTransport> => {
    const capabilities = detectBrowserRadioCapabilities();
    if (!capabilities.supported) {
      throw new Error(`WebUSB not ready in this browser:\n${capabilities.blockers.join("\n")}`);
    }

    const transport = uiState.radioTransport ?? createBrowserRadioTransport(capabilities);
    if (!transport) {
      throw new Error("Unable to initialize WebUSB transport in this browser.");
    }

    uiState.radioTransport = transport;
    if (!transport.isConnected()) {
      const device = await transport.connect();
      const label = [device.manufacturerName, device.productName].filter((item) => Boolean(item)).join(" ").trim();
      uiState.timeSyncStatusMessage = `Connected: ${label || "USB radio"}.`;
    }

    return transport;
  };

  target.querySelector<HTMLButtonElement>("#time-sync-workflow-apply-btn")?.addEventListener("click", async () => {
    if (!uiState.riskAccepted || uiState.timeSyncBusy) {
      return;
    }

    uiState.timeSyncBusy = true;
    uiState.timeSyncStatusMessage = "Preparing date/time sync...";
    renderState(target, store, store.getState(), channelState, uiState);

    try {
      const transport = await ensureRadioTransport();
      if (typeof transport.syncRtcClock !== "function") {
        throw new Error("This browser transport build does not support RTC sync.");
      }

      const timestamp = buildRtcTimestampForZone(uiState.timeSyncTimeZone);
      await transport.syncRtcClock(timestamp.payload);
      await safeRebootRadio(transport);

      uiState.timeSyncStatusMessage = `Sync complete: ${timestamp.label} (${uiState.timeSyncTimeZone}).`;
      showToast({ type: "success", message: `Date/time sync complete (${uiState.timeSyncTimeZone}).` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Date/time sync failed.";
      uiState.timeSyncStatusMessage = `Sync failed: ${message}`;
      showToast({ type: "error", message: `Date/time sync failed: ${message}` });
    } finally {
      uiState.timeSyncBusy = false;
      renderState(target, store, store.getState(), channelState, uiState);
    }
  });

  void state;
}

function ensureDefaultTimeSyncTimeZone(uiState: UiState): void {
  if (TIME_ZONE_OPTIONS.includes(uiState.timeSyncTimeZone)) {
    return;
  }
  uiState.timeSyncTimeZone = zoneFromDateOffset(new Date().getTimezoneOffset());
}

function zoneFromDateOffset(dateOffsetMinutes: number): string {
  const hoursEast = Math.round(-dateOffsetMinutes / 60);
  const clamped = Math.max(-12, Math.min(12, hoursEast));
  const sign = clamped >= 0 ? "+" : "-";
  const abs = Math.abs(clamped);
  return `UTC${sign}${abs}:00`;
}

function buildRtcTimestampForZone(timeZone: string): { payload: BrowserRtcSyncPayload; label: string } {
  const offsetMinutes = parseZoneOffsetMinutes(timeZone);
  const date = new Date(Date.now() + offsetMinutes * 60_000);

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  return {
    payload: { year, month, day, hour, minute, second },
    label: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
  };
}

function parseZoneOffsetMinutes(timeZone: string): number {
  const match = /^UTC([+-])(\d{1,2}):(\d{2})$/.exec(timeZone);
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

async function safeRebootRadio(transport: BrowserRadioTransport): Promise<void> {
  if (typeof transport.rebootRadio === "function") {
    await transport.rebootRadio();
  }
}
