export type RadioVariant = "D" | "S" | "unknown";

export interface Channel {
  id: number;
  name: string;
  contactId?: number;
  scanListId?: number;
  groupListId?: number;
  rxFrequencyMHz: number;
  txFrequencyMHz: number;
  txOffsetMHz: number;
  channelMode: "Analog" | "Digital";
  admitCriteria: "Always" | "Channel free" | "CTCSS/DCS" | "Color code";
  inCallCriteria: "Always" | "Follow Admit Criteria";
  rxOnly: "On" | "Off";
  autoscan: "On" | "Off";
  loneWorker: "On" | "Off";
  vox: "On" | "Off";
  allowTalkaround: "On" | "Off";
  talkaround: "On" | "Off";
  privateCallConfirmed: "On" | "Off";
  dataCallConfirmed: "On" | "Off";
  emergencyAlarmAck: "On" | "Off";
  compressedUdpDataHeader: "On" | "Off";
  displayPttId: "On" | "Off";
  privacy: "None" | "Basic" | "Enhanced";
  privacyNumber: number;
  emergencySystem: number;
  totSec: number | "Infinite";
  totRekeyDelaySec: number;
  rxRefFrequency: "Low" | "Medium" | "High";
  txRefFrequency: "Low" | "Medium" | "High";
  rxSignallingSystem: "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4";
  txSignallingSystem: "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4";
  ctcssDecode: string;
  ctcssEncode: string;
  qtReverse: "180" | "120";
  reverseBurst: "On" | "Off";
  decode1: "On" | "Off";
  decode2: "On" | "Off";
  decode3: "On" | "Off";
  decode4: "On" | "Off";
  decode5: "On" | "Off";
  decode6: "On" | "Off";
  decode7: "On" | "Off";
  decode8: "On" | "Off";
  dcdmSwitch: "On" | "Off";
  leaderMs: "On" | "Off";
  allowInterrupt: "On" | "Off";
  nonQtDqtTurnoffFreq: "259.2 Hz" | "55.2 Hz" | "None" | "Raw-1";
  receiveGpsInfo: "On" | "Off";
  sendGpsInfo: "On" | "Off";
  colorCode: number;
  repeaterSlot: 1 | 2;
  bandwidthKhz: "12.5" | "20" | "25";
  power: "Low" | "High";
  slot?: number;
}

export interface Zone {
  id: number;
  name: string;
  channelIds: number[];
  slot?: number;
}

export interface Contact {
  id: number;
  name: string;
  callId: number;
  slot?: number;
}

export interface GroupList {
  id: number;
  name: string;
  slot?: number;
}

export interface ScanList {
  id: number;
  name: string;
  slot?: number;
}

export interface RadioSettings {
  radioId: number;
  radioName: string;
  voxSensitivity: number;
  txPreambleDurationMs: number;
  rxLowBatteryIntervalSec: number;
  backlightTimeoutSec: "Always" | "5" | "10" | "15";
  keypadAutoLockSec: "Manual" | "5" | "10" | "15";
  bootUpMessageLine1: string;
  bootUpMessageLine2: string;
  alertTones: "On" | "Off";
  timeZone: string;
}

export interface MenuSettings {
  hangTime: string;
  radioDisable: "On" | "Off";
  radioEnable: "On" | "Off";
  remoteMonitor: "On" | "Off";
  radioCheck: "On" | "Off";
  manualDial: "On" | "Off";
  edit: "On" | "Off";
  callAlert: "On" | "Off";
  textMessage: "On" | "Off";
  toneOrAlert: "On" | "Off";
  talkaround: "On" | "Off";
  outgoingRadio: "On" | "Off";
  answered: "On" | "Off";
  missed: "On" | "Off";
  editList: "On" | "Off";
  scan: "On" | "Off";
  programKey: "On" | "Off";
  vox: "On" | "Off";
  squelch: "On" | "Off";
  ledIndicator: "On" | "Off";
  keyboardLock: "On" | "Off";
  introScreen: "On" | "Off";
  backlight: "On" | "Off";
  power: "On" | "Off";
  gps: "On" | "Off";
  programRadio: "On" | "Off";
  displayMode: "On" | "Off";
  passwordAndLock: "On" | "Off";
}

export interface RadioButtonAssignment {
  id: number;
  name: string;
  actionCode: number;
}

export interface TextMessage {
  id: number;
  text: string;
  slot?: number;
}

export interface PrivacySettings {
  enhancedKeys: string[];
  basicKeys: string[];
}

export interface BasicRadioInfo {
  firmwareVersion: string;
  cpsVersion: string;
  mcuVersion: string;
  uniqueDeviceId: string;
  frequencyRange: string;
  lastProgrammedTime: string;
}

export interface CodeplugDocument {
  fileName: string;
  format: "rdt" | "bin" | "dfu";
  variant: RadioVariant;
  sourceSize: number;
  outputFileName: string;
  payloadOffset: number;
  payloadLength: number;
  model: string;
  basicInfo: BasicRadioInfo;
  channels: Channel[];
  zones: Zone[];
  contacts: Contact[];
  groupLists: GroupList[];
  scanLists: ScanList[];
  settings: RadioSettings;
  menuSettings: MenuSettings;
  radioButtons: RadioButtonAssignment[];
  longPressDurationMs: number;
  textMessages: TextMessage[];
  privacySettings: PrivacySettings;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}
