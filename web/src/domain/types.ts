export type RadioVariant = "D" | "S" | "unknown";

export interface Channel {
  id: number;
  name: string;
  contactId?: number;
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

export interface RadioSettings {
  radioId: number;
  radioName: string;
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
  channels: Channel[];
  zones: Zone[];
  contacts: Contact[];
  settings: RadioSettings;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}
