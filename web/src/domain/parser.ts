import type { CodeplugDocument, RadioVariant } from "./types";

const KNOWN_RDT_SIZE = 262709;
const KNOWN_RAW_SIZE = 262144;
const RDT_HEADER_SIZE = 549;
const PAYLOAD_SIZE = 262144;

const GENERAL_SETTINGS_OFFSET = 8805;
const RADIO_ID_OFFSET = 68;
const RADIO_ID_SIZE = 3;
const RADIO_NAME_OFFSET = 112;
const RADIO_NAME_SIZE = 32;

const CONTACTS_OFFSET = 24997;
const CONTACTS_MAX = 1000;
const CONTACTS_RECORD_SIZE = 36;
const CONTACTS_DELETED_OFFSET = 3;
const CONTACTS_DELETED_VALUE = 0xc0;
const CONTACT_CALL_ID_OFFSET = 0;
const CONTACT_CALL_ID_SIZE = 3;
const CONTACT_NAME_OFFSET = 4;
const CONTACT_NAME_SIZE = 32;

const CHANNELS_OFFSET = 127013;
const CHANNELS_MAX = 1000;
const CHANNELS_RECORD_SIZE = 64;
const CHANNELS_DELETED_OFFSET = 16;
const CHANNELS_DELETED_VALUE = 0xff;
const CHANNEL_NAME_OFFSET = 32;
const CHANNEL_NAME_SIZE = 32;
const CHANNEL_CONTACT_INDEX_OFFSET = 6;

const ZONES_OFFSET = 84997;
const ZONES_MAX = 250;
const ZONES_RECORD_SIZE = 64;
const ZONES_DELETED_OFFSET = 0;
const ZONE_NAME_OFFSET = 0;
const ZONE_NAME_SIZE = 32;
const ZONE_CHANNELS_OFFSET = 32;
const ZONE_CHANNELS_MAX = 16;

const BASIC_INFO_OFFSET = 0;
const MODEL_NAME_OFFSET = 293;
const MODEL_NAME_SIZE = 8;

function detectVariantFromSize(size: number): RadioVariant {
  if (size === KNOWN_RDT_SIZE || size === KNOWN_RAW_SIZE) {
    return "D";
  }
  return "unknown";
}

function detectVariantFromModel(model: string): RadioVariant {
  const normalized = model.trim().toUpperCase();
  if (normalized.includes("390") || normalized.includes("RT8")) {
    return "S";
  }
  if (normalized.length > 0) {
    return "D";
  }
  return "unknown";
}

function detectFormat(fileName: string): "rdt" | "bin" | "dfu" {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".rdt")) {
    return "rdt";
  }
  if (lowerName.endsWith(".dfu")) {
    return "dfu";
  }
  return "bin";
}

function readUcs2String(bytes: Uint8Array, offset: number, length: number): string {
  const chars: string[] = [];
  for (let index = 0; index < length; index += 2) {
    const low = bytes[offset + index];
    const high = bytes[offset + index + 1];
    const value = low | (high << 8);
    if (value === 0) {
      break;
    }
    chars.push(String.fromCharCode(value));
  }
  return chars.join("").trim();
}

function writeUcs2String(bytes: Uint8Array, offset: number, length: number, value: string): void {
  bytes.fill(0, offset, offset + length);
  const maxChars = Math.floor(length / 2);
  const safeValue = value.slice(0, maxChars);
  for (let index = 0; index < safeValue.length; index += 1) {
    const code = safeValue.charCodeAt(index);
    bytes[offset + index * 2] = code & 0xff;
    bytes[offset + index * 2 + 1] = (code >> 8) & 0xff;
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  const values: number[] = [];
  for (let index = 0; index < length; index += 1) {
    const code = bytes[offset + index];
    if (code === 0 || code === 0xff) {
      break;
    }
    values.push(code);
  }
  return String.fromCharCode(...values).trim();
}

function readLittleInt(bytes: Uint8Array, offset: number, size: number): number {
  let value = 0;
  for (let index = 0; index < size; index += 1) {
    value |= bytes[offset + index] << (index * 8);
  }
  return value;
}

function writeLittleInt(bytes: Uint8Array, offset: number, size: number, value: number): void {
  for (let index = 0; index < size; index += 1) {
    bytes[offset + index] = (value >> (index * 8)) & 0xff;
  }
}

function outputNameFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".rdt") || lower.endsWith(".bin") || lower.endsWith(".dfu")) {
    const lastDot = fileName.lastIndexOf(".");
    const base = fileName.slice(0, lastDot);
    const ext = fileName.slice(lastDot);
    return `${base}-edited${ext}`;
  }
  return `${fileName}-edited.bin`;
}

function getPayloadLayout(fileName: string, bytes: Uint8Array): { payloadOffset: number; payloadLength: number } {
  const format = detectFormat(fileName);
  if (format === "rdt" && bytes.byteLength >= KNOWN_RDT_SIZE) {
    return { payloadOffset: RDT_HEADER_SIZE, payloadLength: PAYLOAD_SIZE };
  }
  if (bytes.byteLength >= KNOWN_RAW_SIZE) {
    return { payloadOffset: 0, payloadLength: KNOWN_RAW_SIZE };
  }
  return { payloadOffset: 0, payloadLength: bytes.byteLength };
}

export function parseCodeplug(fileName: string, bytes: Uint8Array): CodeplugDocument {
  const layout = getPayloadLayout(fileName, bytes);
  const payload = bytes.subarray(layout.payloadOffset, layout.payloadOffset + layout.payloadLength);

  const model =
    payload.byteLength >= BASIC_INFO_OFFSET + MODEL_NAME_OFFSET + MODEL_NAME_SIZE
      ? readAscii(payload, BASIC_INFO_OFFSET + MODEL_NAME_OFFSET, MODEL_NAME_SIZE)
      : "";

  const contacts = [];
  const channelSlotToLogicalId = new Map<number, number>();
  const channels = [];
  const zones = [];

  for (let index = 0; index < CONTACTS_MAX; index += 1) {
    const base = CONTACTS_OFFSET + index * CONTACTS_RECORD_SIZE;
    if (base + CONTACTS_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base + CONTACTS_DELETED_OFFSET] === CONTACTS_DELETED_VALUE) {
      continue;
    }
    const name = readUcs2String(payload, base + CONTACT_NAME_OFFSET, CONTACT_NAME_SIZE);
    if (!name) {
      continue;
    }
    contacts.push({
      id: contacts.length + 1,
      name,
      callId: readLittleInt(payload, base + CONTACT_CALL_ID_OFFSET, CONTACT_CALL_ID_SIZE),
    });
  }

  for (let index = 0; index < CHANNELS_MAX; index += 1) {
    const base = CHANNELS_OFFSET + index * CHANNELS_RECORD_SIZE;
    if (base + CHANNELS_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base + CHANNELS_DELETED_OFFSET] === CHANNELS_DELETED_VALUE) {
      continue;
    }
    const name = readUcs2String(payload, base + CHANNEL_NAME_OFFSET, CHANNEL_NAME_SIZE);
    if (!name) {
      continue;
    }

    const contactRef = readLittleInt(payload, base + CHANNEL_CONTACT_INDEX_OFFSET, 2);
    const contactId = contactRef > 0 && contactRef <= contacts.length ? contactRef : undefined;
    const logicalId = channels.length + 1;
    channelSlotToLogicalId.set(index + 1, logicalId);

    channels.push({
      id: logicalId,
      name,
      contactId,
    });
  }

  for (let index = 0; index < ZONES_MAX; index += 1) {
    const base = ZONES_OFFSET + index * ZONES_RECORD_SIZE;
    if (base + ZONES_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base + ZONES_DELETED_OFFSET] === 0) {
      continue;
    }
    const name = readUcs2String(payload, base + ZONE_NAME_OFFSET, ZONE_NAME_SIZE);
    if (!name) {
      continue;
    }
    const channelIds: number[] = [];
    for (let channelIndex = 0; channelIndex < ZONE_CHANNELS_MAX; channelIndex += 1) {
      const raw = readLittleInt(payload, base + ZONE_CHANNELS_OFFSET + channelIndex * 2, 2);
      if (raw === 0) {
        continue;
      }
      const mapped = channelSlotToLogicalId.get(raw);
      if (mapped) {
        channelIds.push(mapped);
      }
    }

    zones.push({
      id: zones.length + 1,
      name,
      channelIds,
    });
  }

  const settingsBase = GENERAL_SETTINGS_OFFSET;
  const radioId =
    settingsBase + RADIO_ID_OFFSET + RADIO_ID_SIZE <= payload.byteLength
      ? readLittleInt(payload, settingsBase + RADIO_ID_OFFSET, RADIO_ID_SIZE)
      : 0;
  const radioName =
    settingsBase + RADIO_NAME_OFFSET + RADIO_NAME_SIZE <= payload.byteLength
      ? readUcs2String(payload, settingsBase + RADIO_NAME_OFFSET, RADIO_NAME_SIZE)
      : "";

  const byModel = detectVariantFromModel(model);

  return {
    fileName,
    format: detectFormat(fileName),
    variant: byModel === "unknown" ? detectVariantFromSize(bytes.byteLength) : byModel,
    sourceSize: bytes.byteLength,
    outputFileName: outputNameFor(fileName),
    payloadOffset: layout.payloadOffset,
    payloadLength: layout.payloadLength,
    model,
    channels,
    zones,
    contacts,
    settings: {
      radioId,
      radioName,
    },
  };
}

export function serializeCodeplug(document: CodeplugDocument, originalBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(originalBytes);
  const payload = out.subarray(document.payloadOffset, document.payloadOffset + document.payloadLength);

  if (GENERAL_SETTINGS_OFFSET + RADIO_ID_OFFSET + RADIO_ID_SIZE <= payload.byteLength) {
    writeLittleInt(payload, GENERAL_SETTINGS_OFFSET + RADIO_ID_OFFSET, RADIO_ID_SIZE, document.settings.radioId);
  }
  if (GENERAL_SETTINGS_OFFSET + RADIO_NAME_OFFSET + RADIO_NAME_SIZE <= payload.byteLength) {
    writeUcs2String(payload, GENERAL_SETTINGS_OFFSET + RADIO_NAME_OFFSET, RADIO_NAME_SIZE, document.settings.radioName);
  }

  return out;
}
