export type RadioVariant = "D" | "S" | "unknown";

export interface Channel {
  id: number;
  name: string;
  contactId?: number;
  rxFrequencyMHz: number;
  txFrequencyMHz: number;
  channelMode: "Analog" | "Digital";
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
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}
