import type { BrowserTransferProgress } from "../transport/browserRadio";
import type { UiState } from "./uiTypes";

export const TIME_ZONE_OPTIONS = [
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

export function formatCallsignDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0]; // Return only the date part in YYYY-MM-DD format
  } catch {
    return isoDate;
  }
}

export function downloadBytes(fileName: string, bytes: Uint8Array): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function setRadioProgress(uiState: UiState, progress: BrowserTransferProgress): void {
  uiState.radioProgressVisible = true;
  uiState.radioProgressPercent = Math.min(100, Math.round((progress.completedBlocks / progress.totalBlocks) * 100));
  uiState.radioProgressLabel = `${progress.direction === "read" ? "Reading" : "Writing"} ${progress.completedBlocks}/${progress.totalBlocks} blocks (${uiState.radioProgressPercent}%).`;
}

export function setCallsignProgress(uiState: UiState, progress: BrowserTransferProgress): void {
  uiState.callsignProgressVisible = true;
  uiState.callsignProgressPercent = Math.min(100, Math.round((progress.completedBlocks / progress.totalBlocks) * 100));
  uiState.callsignProgressLabel = `${progress.direction === "read" ? "Reading" : "Writing"} ${progress.completedBlocks}/${progress.totalBlocks} blocks (${uiState.callsignProgressPercent}%).`;
}

export function utcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function normalizeModelToken(value: string | undefined): "MD380" | "MD390" | undefined {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("MD390") || normalized.includes("RT8")) {
    return "MD390";
  }
  if (normalized.includes("MD380") || normalized.includes("RT3") || normalized.includes("DR780")) {
    return "MD380";
  }
  return undefined;
}

export function syncRadioProgressUi(target: HTMLElement, uiState: UiState): void {
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

  const callsignWrap = target.querySelector<HTMLElement>("#callsign-progress-wrap");
  if (callsignWrap) {
    callsignWrap.classList.toggle("hidden", !uiState.callsignProgressVisible);
  }
  const callsignProgress = target.querySelector<HTMLProgressElement>("#callsign-progress");
  if (callsignProgress) {
    callsignProgress.value = uiState.callsignProgressPercent;
  }
  const callsignLabel = target.querySelector<HTMLElement>("#callsign-progress-label");
  if (callsignLabel) {
    callsignLabel.textContent = uiState.callsignProgressLabel;
  }
}

export function inferMaker(model: string): string {
  const normalized = model.toLowerCase();
  if (normalized.includes("tyt") || normalized.includes("md380") || normalized.includes("md390")) {
    return "TYT";
  }
  if (normalized.includes("rt3") || normalized.includes("rt8")) {
    return "Retevis";
  }
  return "Unknown";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}