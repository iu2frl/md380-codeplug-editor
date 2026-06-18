import type { BrowserRadioTransport } from "../transport/browserRadio";
import type { CallsignFormat, CallsignProfile } from "../domain/callsign";

export interface ChannelPanelState {
  query: string;
  modeFilter: "all" | "Analog" | "Digital";
  bulkExpanded: boolean;
  bulkTarget: "filtered" | "selected";
  bulkSelectionIds: number[];
  bulkMode: "" | "Analog" | "Digital";
  bulkPower: "" | "Low" | "High";
  bulkBandwidth: "" | "12.5" | "20" | "25";
  bulkRepeaterSlot: "" | "1" | "2";
  bulkColorCode: string;
  bulkRxFrequencyMHz: string;
  bulkTxOffsetMHz: string;
}

export type ActiveTab =
  | "basic"
  | "general"
  | "menus"
  | "buttons"
  | "digital-text"
  | "encryption"
  | "digital-contacts"
  | "dtmf"
  | "one-touch"
  | "zones"
  | "group-lists"
  | "scan-lists"
  | "channels"
  | "radio-transfer";

export type ActiveGuideModal = "import" | "landing-read" | "radio-transfer" | null;

export interface UiState {
  activeTab: ActiveTab;
  landingView: "home" | "callsign-workflow" | "time-sync-workflow" | "screenshot-workflow" | "firmware-workflow";
  riskAccepted: boolean;
  busy: boolean;
  activeGuideModal: ActiveGuideModal;
  selectedZoneId: number | null;
  selectedGroupListId: number | null;
  selectedScanListId: number | null;
  selectedChannelId: number | null;
  channelsListScrollTop: number;
  zonesListScrollTop: number;
  zonesChannelPoolScrollTop: number;
  scanListsListScrollTop: number;
  scanListChannelPoolScrollTop: number;
  radioTransport: BrowserRadioTransport | null;
  radioStatusMessage: string;
  radioBusy: boolean;
  radioProgressPercent: number;
  radioProgressLabel: string;
  radioProgressVisible: boolean;
  callsignFormat: CallsignFormat;
  callsignProfile: CallsignProfile;
  callsignPayload: Uint8Array | null;
  callsignPayloadName: string;
  callsignStatusMessage: string;
  callsignBusy: boolean;
  callsignProgressPercent: number;
  callsignProgressLabel: string;
  callsignProgressVisible: boolean;
  callsignLastUpdated: string | null;
  timeSyncTimeZone: string;
  timeSyncStatusMessage: string;
  timeSyncBusy: boolean;
  screenshotBusy: boolean;
  screenshotStatusMessage: string;
  screenshotProgressLine: number;
  screenshotProgressVisible: boolean;
  screenshotImageData: Uint8Array | null;
  firmwareBusy: boolean;
  firmwareStatusMessage: string;
  firmwareProgressPercent: number;
  firmwareProgressLabel: string;
  firmwareProgressVisible: boolean;
}

export function createInitialChannelPanelState(): ChannelPanelState {
  return {
    query: "",
    modeFilter: "all",
    bulkExpanded: false,
    bulkTarget: "filtered",
    bulkSelectionIds: [],
    bulkMode: "",
    bulkPower: "",
    bulkBandwidth: "",
    bulkRepeaterSlot: "",
    bulkColorCode: "",
    bulkRxFrequencyMHz: "",
    bulkTxOffsetMHz: "",
  };
}

export function createInitialUiState(): UiState {
  return {
    activeTab: "basic",
    landingView: "home",
    riskAccepted: false,
    busy: false,
    activeGuideModal: null,
    selectedZoneId: null,
    selectedGroupListId: null,
    selectedScanListId: null,
    selectedChannelId: null,
    channelsListScrollTop: 0,
    zonesListScrollTop: 0,
    zonesChannelPoolScrollTop: 0,
    scanListsListScrollTop: 0,
    scanListChannelPoolScrollTop: 0,
    radioTransport: null,
    radioStatusMessage: "Not connected.",
    radioBusy: false,
    radioProgressPercent: 0,
    radioProgressLabel: "No transfer in progress.",
    radioProgressVisible: false,
    callsignFormat: "indexed",
    callsignProfile: "global",
    callsignPayload: null,
    callsignPayloadName: "",
    callsignStatusMessage: "No callsign database built yet.",
    callsignBusy: false,
    callsignProgressPercent: 0,
    callsignProgressLabel: "No transfer in progress.",
    callsignProgressVisible: false,
    callsignLastUpdated: null,
    timeSyncTimeZone: "",
    timeSyncStatusMessage: "No date/time sync performed yet.",
    timeSyncBusy: false,
    screenshotBusy: false,
    screenshotStatusMessage: "No screenshot captured yet.",
    screenshotProgressLine: 0,
    screenshotProgressVisible: false,
    screenshotImageData: null,
    firmwareBusy: false,
    firmwareStatusMessage: "No firmware backup performed yet.",
    firmwareProgressPercent: 0,
    firmwareProgressLabel: "No transfer in progress.",
    firmwareProgressVisible: false,
  };
}