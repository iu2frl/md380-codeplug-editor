import type { Channel, CodeplugDocument, RadioVariant } from "./types";

const KNOWN_RDT_SIZE = 262709;
const KNOWN_RAW_SIZE = 262144;
const RDT_HEADER_SIZE = 549;
const PAYLOAD_SIZE = 262144;

const GENERAL_SETTINGS_OFFSET = 8256;
const MENU_SETTINGS_OFFSET = 8981;
const RADIO_BUTTONS_OFFSET = 8999;
const RADIO_BUTTONS_MAX = 4;
const BUTTON_DEFINITIONS_OFFSET = 9014;
const ONE_LONG_PRESS_DURATION_BIT_OFFSET = 0;
const TEXT_MESSAGES_OFFSET = 9125;
const TEXT_MESSAGES_MAX = 50;
const TEXT_MESSAGE_RECORD_SIZE = 288;
const PRIVACY_SETTINGS_OFFSET = 23525;
const PRIVACY_RECORD_SIZE = 176;
const PRIVACY_ENHANCED_KEYS_MAX = 8;
const PRIVACY_ENHANCED_KEY_SIZE = 16;
const PRIVACY_BASIC_KEYS_MAX = 16;
const PRIVACY_BASIC_KEYS_OFFSET = 144;
const PRIVACY_BASIC_KEY_SIZE = 2;

const MENU_HANG_TIME_BIT_OFFSET = 0;
const MENU_RADIO_DISABLE_BIT_OFFSET = 8;
const MENU_RADIO_ENABLE_BIT_OFFSET = 9;
const MENU_REMOTE_MONITOR_BIT_OFFSET = 10;
const MENU_RADIO_CHECK_BIT_OFFSET = 11;
const MENU_MANUAL_DIAL_BIT_OFFSET = 12;
const MENU_EDIT_BIT_OFFSET = 13;
const MENU_CALL_ALERT_BIT_OFFSET = 14;
const MENU_TEXT_MESSAGE_BIT_OFFSET = 15;
const MENU_TONE_OR_ALERT_BIT_OFFSET = 16;
const MENU_TALKAROUND_BIT_OFFSET = 17;
const MENU_OUTGOING_RADIO_BIT_OFFSET = 18;
const MENU_ANSWERED_BIT_OFFSET = 19;
const MENU_MISSED_BIT_OFFSET = 20;
const MENU_EDIT_LIST_BIT_OFFSET = 21;
const MENU_SCAN_BIT_OFFSET = 22;
const MENU_PROGRAM_KEY_BIT_OFFSET = 23;
const MENU_VOX_BIT_OFFSET = 24;
const MENU_SQUELCH_BIT_OFFSET = 26;
const MENU_LED_INDICATOR_BIT_OFFSET = 27;
const MENU_KEYBOARD_LOCK_BIT_OFFSET = 28;
const MENU_INTRO_SCREEN_BIT_OFFSET = 29;
const MENU_BACKLIGHT_BIT_OFFSET = 30;
const MENU_POWER_BIT_OFFSET = 31;
const MENU_GPS_BIT_OFFSET = 36;
const MENU_PROGRAM_RADIO_BIT_OFFSET = 37;
const MENU_DISPLAY_MODE_BIT_OFFSET = 38;
const MENU_PASSWORD_AND_LOCK_BIT_OFFSET = 39;
const INTRO_SCREEN_LINE1_OFFSET = 0;
const INTRO_SCREEN_LINE_SIZE = 20;
const INTRO_SCREEN_LINE2_OFFSET = INTRO_SCREEN_LINE1_OFFSET + INTRO_SCREEN_LINE_SIZE;
const DISABLE_ALL_TONES_BIT_OFFSET = 525;
const TX_PREAMBLE_DURATION_BIT_OFFSET = 576;
const VOX_SENSITIVITY_BIT_OFFSET = 600;
const RX_LOW_BATTERY_INTERVAL_BIT_OFFSET = 624;
const BACKLIGHT_TIMEOUT_BIT_OFFSET = 686;
const KEYPAD_AUTO_LOCK_BIT_OFFSET = 688;
const TIME_ZONE_BIT_OFFSET = 856;
const RADIO_ID_OFFSET = 68;
const RADIO_ID_SIZE = 3;
const RADIO_NAME_OFFSET = 112;
const RADIO_NAME_SIZE = 32;

const CONTACTS_OFFSET = 24448;
const CONTACTS_MAX = 1000;
const CONTACTS_RECORD_SIZE = 36;
const CONTACTS_DELETED_OFFSET = 3;
const CONTACTS_DELETED_VALUE = 0xc0;
const CONTACT_CALL_ID_OFFSET = 0;
const CONTACT_CALL_ID_SIZE = 3;
const CONTACT_NAME_OFFSET = 4;
const CONTACT_NAME_SIZE = 32;

const CHANNELS_OFFSET = 126464;
const CHANNELS_MAX = 1000;
const CHANNELS_RECORD_SIZE = 64;
const CHANNELS_DELETED_OFFSET = 16;
const CHANNELS_DELETED_VALUE = 0xff;
const CHANNEL_NAME_OFFSET = 32;
const CHANNEL_NAME_SIZE = 32;
const CHANNEL_CONTACT_INDEX_OFFSET = 6;
const CHANNEL_SCAN_LIST_INDEX_OFFSET = 11;
const CHANNEL_GROUP_LIST_INDEX_OFFSET = 12;
const CHANNEL_BANDWIDTH_BIT_OFFSET = 4;
const CHANNEL_MODE_BIT_OFFSET = 6;
const CHANNEL_COLOR_CODE_BIT_OFFSET = 8;
const CHANNEL_SLOT_BIT_OFFSET = 12;
const CHANNEL_RX_ONLY_BIT_OFFSET = 14;
const CHANNEL_ALLOW_TALKAROUND_BIT_OFFSET = 15;
const CHANNEL_DATA_CALL_CONFIRMED_BIT_OFFSET = 16;
const CHANNEL_PRIVATE_CALL_CONFIRMED_BIT_OFFSET = 17;
const CHANNEL_PRIVACY_BIT_OFFSET = 18;
const CHANNEL_PRIVACY_NUMBER_BIT_OFFSET = 20;
const CHANNEL_DISPLAY_PTT_ID_BIT_OFFSET = 24;
const CHANNEL_COMPRESSED_UDP_HEADER_BIT_OFFSET = 25;
const CHANNEL_TALKAROUND_BIT_OFFSET = 26;
const CHANNEL_EMERGENCY_ALARM_ACK_BIT_OFFSET = 28;
const CHANNEL_RX_REF_FREQUENCY_BIT_OFFSET = 30;
const CHANNEL_ADMIT_CRITERIA_BIT_OFFSET = 32;
const CHANNEL_POWER_BIT_OFFSET = 34;
const CHANNEL_VOX_BIT_OFFSET = 35;
const CHANNEL_TX_REF_FREQUENCY_BIT_OFFSET = 38;
const CHANNEL_IN_CALL_CRITERIA_BIT_OFFSET = 43;
const CHANNEL_TOT_BIT_OFFSET = 64;
const CHANNEL_TOT_REKEY_DELAY_BIT_OFFSET = 72;
const CHANNEL_EMERGENCY_SYSTEM_BIT_OFFSET = 80;
const CHANNEL_DECODE1_BIT_OFFSET = 112;
const CHANNEL_DECODE2_BIT_OFFSET = 113;
const CHANNEL_DECODE3_BIT_OFFSET = 114;
const CHANNEL_DECODE4_BIT_OFFSET = 115;
const CHANNEL_DECODE5_BIT_OFFSET = 116;
const CHANNEL_DECODE6_BIT_OFFSET = 117;
const CHANNEL_DECODE7_BIT_OFFSET = 118;
const CHANNEL_DECODE8_BIT_OFFSET = 119;
const CHANNEL_CTCSS_DECODE_BIT_OFFSET = 192;
const CHANNEL_CTCSS_ENCODE_BIT_OFFSET = 208;
const CHANNEL_RX_SIGNALLING_SYSTEM_BIT_OFFSET = 224;
const CHANNEL_TX_SIGNALLING_SYSTEM_BIT_OFFSET = 232;
const CHANNEL_DQTTURNOFF_FREQ_BIT_OFFSET = 40;
const CHANNEL_QT_REVERSE_BIT_OFFSET = 36;
const CHANNEL_REVERSE_BURST_BIT_OFFSET = 37;
const CHANNEL_LEADER_MS_BIT_OFFSET = 251;
const CHANNEL_DCDM_SWITCH_BIT_OFFSET = 252;
const CHANNEL_ALLOW_INTERRUPT_BIT_OFFSET = 253;
const CHANNEL_LONE_WORKER_BIT_OFFSET = 0;
const CHANNEL_AUTOSCAN_BIT_OFFSET = 3;
const CHANNEL_RECEIVE_GPS_INFO_BIT_OFFSET = 254;
const CHANNEL_SEND_GPS_INFO_BIT_OFFSET = 255;
const CHANNEL_RX_FREQ_OFFSET = 16;
const CHANNEL_TX_FREQ_OFFSET = 20;

const ZONES_OFFSET = 84448;
const ZONES_MAX = 250;
const ZONES_RECORD_SIZE = 64;
const ZONES_DELETED_OFFSET = 0;
const ZONE_NAME_OFFSET = 0;
const ZONE_NAME_SIZE = 32;
const ZONE_CHANNELS_OFFSET = 32;
const ZONE_CHANNELS_MAX = 16;

const GROUP_LISTS_OFFSET = 60448;
const GROUP_LISTS_MAX = 250;
const GROUP_LISTS_RECORD_SIZE = 96;
const GROUP_LISTS_DELETED_OFFSET = 0;
const GROUP_LIST_NAME_OFFSET = 0;
const GROUP_LIST_NAME_SIZE = 32;

const SCAN_LISTS_OFFSET = 100448;
const SCAN_LISTS_MAX = 250;
const SCAN_LISTS_RECORD_SIZE = 104;
const SCAN_LISTS_DELETED_OFFSET = 0;
const SCAN_LIST_NAME_OFFSET = 0;
const SCAN_LIST_NAME_SIZE = 32;

const BASIC_INFO_OFFSET = 0;
const MODEL_NAME_OFFSET = 293;
const MODEL_NAME_SIZE = 8;
const BASIC_FREQUENCY_RANGE_BIT_OFFSET = 2480;
const BASIC_LOW_FREQUENCY_OFFSET = 313;
const BASIC_HIGH_FREQUENCY_OFFSET = 315;
const BASIC_LAST_PROGRAMMED_TIME_OFFSET = 8742;
const BASIC_LAST_PROGRAMMED_TIME_SIZE = 7;
const BASIC_CPS_VERSION_OFFSET = 8749;
const BASIC_CPS_VERSION_SIZE = 4;

const FREQUENCY_RANGE_OPTIONS = ["136-174", "350-400", "400-480", "450-520"] as const;
const BACKLIGHT_TIMEOUT_OPTIONS = ["Always", "5", "10", "15"] as const;
const KEYPAD_AUTO_LOCK_VALUES = ["5", "10", "15", "Manual"] as const;
const TIME_ZONE_OPTIONS = [
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
] as const;

const RADIO_BUTTON_ACTIONS = [
  { code: 0, label: "Unassigned (default)" },
  { code: 1, label: "All alert Tones On/Off" },
  { code: 2, label: "Emergency On" },
  { code: 3, label: "Emergency Off" },
  { code: 4, label: "High/Low Power" },
  { code: 5, label: "Monitor" },
  { code: 6, label: "Nuisance Delete" },
  { code: 7, label: "One Touch Access 1" },
  { code: 8, label: "One Touch Access 2" },
  { code: 9, label: "One Touch Access 3" },
  { code: 10, label: "One Touch Access 4" },
  { code: 11, label: "One Touch Access 5" },
  { code: 12, label: "One Touch Access 6" },
  { code: 13, label: "Repeater/Talkaround" },
  { code: 14, label: "Scan On/Off" },
  { code: 21, label: "Squelch Tight/Normal" },
  { code: 22, label: "Privacy On/Off" },
  { code: 23, label: "VOX On/Off" },
  { code: 24, label: "Zone +" },
  { code: 25, label: "Zone Toggle" },
  { code: 26, label: "Battery Indicator" },
  { code: 30, label: "Manual Dial For Private" },
  { code: 31, label: "Lone Work On/Off" },
  { code: 38, label: "1750 Hz" },
  { code: 80, label: "Toggle Backlight (md380tools)" },
  { code: 81, label: "Set Talkgroup (md380tools)" },
  { code: 82, label: "Morse Narrator (md380tools)" },
  { code: 83, label: "Morse Repeat (md380tools)" },
  { code: 84, label: "Screen Toggle (md380tools)" },
  { code: 85, label: "Mic Gain 0/3/6 dB (md380tools)" },
  { code: 86, label: "Promiscuous Mode On/Off (md380tools)" },
] as const;

const SUPPORTED_D_MODELS = ["MD380", "DR780", "RT3"];
const SUPPORTED_S_MODELS = ["MD390", "RT8"];

export class CodeplugParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeplugParseError";
  }
}

function detectVariantFromSize(size: number): RadioVariant {
  if (size === KNOWN_RDT_SIZE || size === KNOWN_RAW_SIZE) {
    return "D";
  }
  return "unknown";
}

function detectVariantFromModel(model: string): RadioVariant {
  const normalized = model.trim().toUpperCase();
  if (SUPPORTED_S_MODELS.some((token) => normalized.includes(token))) {
    return "S";
  }
  if (SUPPORTED_D_MODELS.some((token) => normalized.includes(token))) {
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

function readNibbleDecimalString(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.byteLength) {
    return "";
  }
  let out = "";
  for (let index = 0; index < length; index += 1) {
    const digit = bytes[offset + index];
    out += digit <= 9 ? `${digit}` : "0";
  }
  return out;
}

function writeNibbleDecimalString(bytes: Uint8Array, offset: number, length: number, value: string): void {
  for (let index = 0; index < length; index += 1) {
    const char = value[index] ?? "0";
    const digit = char >= "0" && char <= "9" ? Number.parseInt(char, 10) : 0;
    bytes[offset + index] = digit;
  }
}

function readBcdDigitString(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.byteLength) {
    return "";
  }
  let out = "";
  for (let index = 0; index < length; index += 1) {
    const value = bytes[offset + index];
    out += `${(value >> 4) & 0x0f}${value & 0x0f}`;
  }
  return out;
}

function formatLastProgrammedTime(raw: string): string {
  if (!/^\d{14}$/.test(raw)) {
    return "";
  }
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  const second = raw.slice(12, 14);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function parseBiFrequencyMHz(bytes: Uint8Array, offset: number): number {
  if (offset + 2 > bytes.byteLength) {
    return 0;
  }
  return bcdToInt(readLittleInt(bytes, offset, 2)) / 10;
}

function encodeBacklightTimeout(value: string): number {
  const index = BACKLIGHT_TIMEOUT_OPTIONS.indexOf(value as (typeof BACKLIGHT_TIMEOUT_OPTIONS)[number]);
  return index >= 0 ? index : 0;
}

function decodeBacklightTimeout(raw: number): "Always" | "5" | "10" | "15" {
  return BACKLIGHT_TIMEOUT_OPTIONS[raw] ?? "Always";
}

function decodeKeypadAutoLock(raw: number): "Manual" | "5" | "10" | "15" {
  if (raw === 5 || raw === 10 || raw === 15) {
    return `${raw}` as "5" | "10" | "15";
  }
  return "Manual";
}

function encodeKeypadAutoLock(value: string): number {
  if (value === "5" || value === "10" || value === "15") {
    return Number.parseInt(value, 10);
  }
  return 0xff;
}

function decodeTimeZone(raw: number): string {
  return TIME_ZONE_OPTIONS[raw] ?? "UTC+0:00";
}

function encodeTimeZone(value: string): number {
  const index = TIME_ZONE_OPTIONS.indexOf(value as (typeof TIME_ZONE_OPTIONS)[number]);
  return index >= 0 ? index : 12;
}

function parseOffOnBit(value: number): "On" | "Off" {
  return value === 0 ? "Off" : "On";
}

function encodeOffOnBit(value: "On" | "Off"): number {
  return value === "On" ? 1 : 0;
}

function parseOnOffBit(value: number): "On" | "Off" {
  return value === 0 ? "On" : "Off";
}

function encodeOnOffBit(value: "On" | "Off"): number {
  return value === "On" ? 0 : 1;
}

function decodeCtcssDcs(raw: number): string {
  if (raw === 0 || raw === 0xffff) {
    return "None";
  }
  const kind = raw >> 14;
  const code = bcdToInt(raw & 0x3fff);
  if (kind === 0) {
    return `${Math.floor(code / 10)}.${code % 10}`;
  }
  if (kind === 2) {
    return `D${String(code).padStart(3, "0")}N`;
  }
  if (kind === 3) {
    return `D${String(code).padStart(3, "0")}I`;
  }
  return "None";
}

function encodeCtcssDcs(value: string): number {
  if (!value || value === "None") {
    return 0;
  }
  if (/^D\d{3}[NI]$/.test(value)) {
    const code = Number.parseInt(value.slice(1, 4), 10);
    const kind = value.endsWith("N") ? 2 : 3;
    return (kind << 14) | (intToBcd(code) & 0x3fff);
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0xffff;
  }
  const code = Math.round(parsed * 10);
  return intToBcd(code) & 0x3fff;
}

function decodeDqtTurnoffFreq(value: number): "259.2 Hz" | "55.2 Hz" | "None" | "Raw-1" {
  if (value === 0) {
    return "259.2 Hz";
  }
  if (value === 1) {
    return "Raw-1";
  }
  if (value === 2) {
    return "55.2 Hz";
  }
  return "None";
}

function encodeDqtTurnoffFreq(value: "259.2 Hz" | "55.2 Hz" | "None" | "Raw-1"): number {
  if (value === "259.2 Hz") {
    return 0;
  }
  if (value === "Raw-1") {
    return 1;
  }
  if (value === "55.2 Hz") {
    return 2;
  }
  return 3;
}

function parseMenuHangTime(raw: number): string {
  return raw === 0 ? "Hang" : `${raw}`;
}

function encodeMenuHangTime(value: string): number {
  if (value === "Hang") {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 10;
  }
  return Math.max(0, Math.min(30, parsed));
}

function labelForRadioButtonAction(code: number): string {
  const found = RADIO_BUTTON_ACTIONS.find((item) => item.code === code);
  return found ? found.label : `Unknown (${code})`;
}

function readHexString(bytes: Uint8Array, offset: number, size: number): string {
  if (offset + size > bytes.byteLength) {
    return "";
  }
  return Array.from(bytes.subarray(offset, offset + size))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function writeHexString(bytes: Uint8Array, offset: number, size: number, value: string): void {
  const normalized = value.toLowerCase().replace(/[^0-9a-f]/g, "").padEnd(size * 2, "f").slice(0, size * 2);
  for (let index = 0; index < size; index += 1) {
    const pair = normalized.slice(index * 2, index * 2 + 2);
    const parsed = Number.parseInt(pair, 16);
    bytes[offset + index] = Number.isNaN(parsed) ? 0xff : parsed;
  }
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
    value += bytes[offset + index] * 2 ** (index * 8);
  }
  return value;
}

function writeLittleInt(bytes: Uint8Array, offset: number, size: number, value: number): void {
  for (let index = 0; index < size; index += 1) {
    bytes[offset + index] = Math.floor(value / 2 ** (index * 8)) & 0xff;
  }
}

function readBitField(record: Uint8Array, bitOffset: number, bitSize: number): number {
  const byteOffset = Math.floor(bitOffset / 8);
  const rightOffset = (bitOffset + bitSize) % 8;
  let value = record[byteOffset];
  if (rightOffset !== 0) {
    value >>= 8 - rightOffset;
  }
  return value & ((1 << bitSize) - 1);
}

function writeBitField(record: Uint8Array, bitOffset: number, bitSize: number, value: number): void {
  const byteOffset = Math.floor(bitOffset / 8);
  let mask = (1 << bitSize) - 1;
  let shiftedValue = value;
  const rightOffset = (bitOffset + bitSize) % 8;
  if (rightOffset !== 0) {
    mask <<= 8 - rightOffset;
    shiftedValue <<= 8 - rightOffset;
  }
  record[byteOffset] = (record[byteOffset] & (~mask & 0xff)) | (shiftedValue & mask);
}

function bcdToInt(value: number): number {
  let input = value;
  let out = 0;
  let multiplier = 1;
  for (let index = 0; index < 8; index += 1) {
    const digit = input & 0xf;
    if (digit > 9) {
      return 0;
    }
    out += digit * multiplier;
    multiplier *= 10;
    input >>= 4;
  }
  return out;
}

function intToBcd(value: number): number {
  let input = Math.max(0, Math.floor(value));
  let out = 0;
  for (let index = 0; index < 8; index += 1) {
    out |= (input % 10) << (4 * index);
    input = Math.floor(input / 10);
  }
  return out;
}

function readFrequencyMHz(record: Uint8Array, offset: number): number {
  const raw = readLittleInt(record, offset, 4);
  return bcdToInt(raw) / 100000;
}

function writeFrequencyMHz(record: Uint8Array, offset: number, mhz: number): void {
  const bcd = intToBcd(Math.round(mhz * 100000));
  writeLittleInt(record, offset, 4, bcd);
}

function parseMode(value: number): "Analog" | "Digital" {
  return value === 2 ? "Digital" : "Analog";
}

function encodeMode(value: "Analog" | "Digital"): number {
  return value === "Digital" ? 2 : 1;
}

function parseBandwidth(value: number): "12.5" | "20" | "25" {
  if (value === 1) {
    return "20";
  }
  if (value === 2) {
    return "25";
  }
  return "12.5";
}

function encodeBandwidth(value: "12.5" | "20" | "25"): number {
  if (value === "20") {
    return 1;
  }
  if (value === "25") {
    return 2;
  }
  return 0;
}

function parseSlot(value: number): 1 | 2 {
  return value === 2 ? 2 : 1;
}

function encodeSlot(value: 1 | 2): number {
  return value === 2 ? 2 : 1;
}

function parsePower(value: number): "Low" | "High" {
  return value === 0 ? "Low" : "High";
}

function decodePrivacy(value: number): "None" | "Basic" | "Enhanced" {
  if (value === 1) {
    return "Basic";
  }
  if (value === 2) {
    return "Enhanced";
  }
  return "None";
}

function encodePrivacy(value: "None" | "Basic" | "Enhanced"): number {
  if (value === "Basic") {
    return 1;
  }
  if (value === "Enhanced") {
    return 2;
  }
  return 0;
}

function decodeAdmitCriteria(value: number): "Always" | "Channel free" | "CTCSS/DCS" | "Color code" {
  if (value === 1) {
    return "Channel free";
  }
  if (value === 2) {
    return "CTCSS/DCS";
  }
  if (value === 3) {
    return "Color code";
  }
  return "Always";
}

function encodeAdmitCriteria(value: "Always" | "Channel free" | "CTCSS/DCS" | "Color code"): number {
  if (value === "Channel free") {
    return 1;
  }
  if (value === "CTCSS/DCS") {
    return 2;
  }
  if (value === "Color code") {
    return 3;
  }
  return 0;
}

function decodeInCallCriteria(value: number): "Always" | "Follow Admit Criteria" {
  return value === 1 ? "Follow Admit Criteria" : "Always";
}

function encodeInCallCriteria(value: "Always" | "Follow Admit Criteria"): number {
  return value === "Follow Admit Criteria" ? 1 : 0;
}

function decodeRefFrequency(value: number): "Low" | "Medium" | "High" {
  if (value === 1) {
    return "Medium";
  }
  if (value === 2) {
    return "High";
  }
  return "Low";
}

function encodeRefFrequency(value: "Low" | "Medium" | "High"): number {
  if (value === "Medium") {
    return 1;
  }
  if (value === "High") {
    return 2;
  }
  return 0;
}

function decodeSignallingSystem(value: number): "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4" {
  if (value === 1) {
    return "DTMF-1";
  }
  if (value === 2) {
    return "DTMF-2";
  }
  if (value === 3) {
    return "DTMF-3";
  }
  if (value === 4) {
    return "DTMF-4";
  }
  return "Off";
}

function encodeSignallingSystem(value: "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4"): number {
  if (value === "DTMF-1") {
    return 1;
  }
  if (value === "DTMF-2") {
    return 2;
  }
  if (value === "DTMF-3") {
    return 3;
  }
  if (value === "DTMF-4") {
    return 4;
  }
  return 0;
}

function decodeTotSec(value: number): number | "Infinite" {
  if (value <= 0) {
    return "Infinite";
  }
  return value * 15;
}

function encodeTotSec(value: number | "Infinite"): number {
  if (value === "Infinite") {
    return 0;
  }
  return Math.max(0, Math.min(37, Math.round(value / 15)));
}

function encodePower(value: "Low" | "High"): number {
  return value === "Low" ? 0 : 1;
}

function normalizeSlot(slot: number | undefined, max: number, used: Set<number>): number | undefined {
  if (!slot || slot < 1 || slot > max || used.has(slot)) {
    return undefined;
  }
  return slot;
}

function allocateSlot(max: number, used: Set<number>): number | undefined {
  for (let slot = 1; slot <= max; slot += 1) {
    if (!used.has(slot)) {
      used.add(slot);
      return slot;
    }
  }
  return undefined;
}

function resolveSlots(
  items: Array<{ id: number; slot?: number }>,
  max: number,
): Map<number, number> {
  const used = new Set<number>();
  const mapping = new Map<number, number>();

  for (const item of items) {
    const valid = normalizeSlot(item.slot, max, used);
    if (valid) {
      used.add(valid);
      mapping.set(item.id, valid);
    }
  }

  for (const item of items) {
    if (mapping.has(item.id)) {
      continue;
    }
    const allocated = allocateSlot(max, used);
    if (allocated) {
      mapping.set(item.id, allocated);
    }
  }

  return mapping;
}

function writeContacts(payload: Uint8Array, document: CodeplugDocument): Map<number, number> {
  const contactSlotById = resolveSlots(document.contacts, CONTACTS_MAX);
  const activeSlots = new Set<number>(contactSlotById.values());

  for (let slot = 1; slot <= CONTACTS_MAX; slot += 1) {
    const base = CONTACTS_OFFSET + (slot - 1) * CONTACTS_RECORD_SIZE;
    if (base + CONTACTS_RECORD_SIZE > payload.byteLength) {
      break;
    }

    if (!activeSlots.has(slot)) {
      const hasName = readUcs2String(payload, base + CONTACT_NAME_OFFSET, CONTACT_NAME_SIZE).length > 0;
      if (hasName) {
        payload[base + CONTACTS_DELETED_OFFSET] = CONTACTS_DELETED_VALUE;
      }
      continue;
    }

    const contact = document.contacts.find((item) => contactSlotById.get(item.id) === slot);
    if (!contact) {
      continue;
    }

    writeLittleInt(payload, base + CONTACT_CALL_ID_OFFSET, CONTACT_CALL_ID_SIZE, contact.callId);
    writeUcs2String(payload, base + CONTACT_NAME_OFFSET, CONTACT_NAME_SIZE, contact.name);
    if (payload[base + CONTACTS_DELETED_OFFSET] === CONTACTS_DELETED_VALUE) {
      payload[base + CONTACTS_DELETED_OFFSET] = 0;
    }
  }

  return contactSlotById;
}

function writeChannels(
  payload: Uint8Array,
  document: CodeplugDocument,
  contactSlotById: Map<number, number>,
): Map<number, number> {
  const channelSlotById = resolveSlots(document.channels, CHANNELS_MAX);
  const scanListSlotById = resolveSlots(document.scanLists, SCAN_LISTS_MAX);
  const groupListSlotById = resolveSlots(document.groupLists, GROUP_LISTS_MAX);
  const activeSlots = new Set<number>(channelSlotById.values());

  for (let slot = 1; slot <= CHANNELS_MAX; slot += 1) {
    const base = CHANNELS_OFFSET + (slot - 1) * CHANNELS_RECORD_SIZE;
    if (base + CHANNELS_RECORD_SIZE > payload.byteLength) {
      break;
    }

    if (!activeSlots.has(slot)) {
      const hasName = readUcs2String(payload, base + CHANNEL_NAME_OFFSET, CHANNEL_NAME_SIZE).length > 0;
      if (hasName) {
        payload[base + CHANNELS_DELETED_OFFSET] = CHANNELS_DELETED_VALUE;
      }
      continue;
    }

    const channel = document.channels.find((item) => channelSlotById.get(item.id) === slot);
    if (!channel) {
      continue;
    }

    if (
      channel.slot !== undefined
      && channel._rawRecordHex
      && !channel._dirty
      && channel._rawSignature === buildChannelSignature(channel)
    ) {
      writeHexString(payload, base, CHANNELS_RECORD_SIZE, channel._rawRecordHex);
      const contactSlot = channel.contactId ? contactSlotById.get(channel.contactId) ?? 0 : 0;
      writeLittleInt(payload, base + CHANNEL_CONTACT_INDEX_OFFSET, 2, contactSlot);
      const scanListSlot = channel.scanListId ? scanListSlotById.get(channel.scanListId) ?? 0 : 0;
      const groupListSlot = channel.groupListId ? groupListSlotById.get(channel.groupListId) ?? 0 : 0;
      writeBitField(payload, base * 8 + CHANNEL_SCAN_LIST_INDEX_OFFSET * 8, 8, scanListSlot);
      writeBitField(payload, base * 8 + CHANNEL_GROUP_LIST_INDEX_OFFSET * 8, 8, groupListSlot);
      continue;
    }

    if (channel.slot === undefined) {
      payload.fill(0, base, base + CHANNELS_RECORD_SIZE);
    }

    writeFrequencyMHz(payload, base + CHANNEL_RX_FREQ_OFFSET, channel.rxFrequencyMHz);
    writeFrequencyMHz(payload, base + CHANNEL_TX_FREQ_OFFSET, channel.txFrequencyMHz);
    writeBitField(payload, base * 8 + CHANNEL_BANDWIDTH_BIT_OFFSET, 2, encodeBandwidth(channel.bandwidthKhz));
    writeBitField(payload, base * 8 + CHANNEL_MODE_BIT_OFFSET, 2, encodeMode(channel.channelMode));
    writeBitField(payload, base * 8 + CHANNEL_ADMIT_CRITERIA_BIT_OFFSET, 2, encodeAdmitCriteria(channel.admitCriteria));
    writeBitField(payload, base * 8 + CHANNEL_RX_ONLY_BIT_OFFSET, 1, encodeOffOnBit(channel.rxOnly));
    writeBitField(payload, base * 8 + CHANNEL_AUTOSCAN_BIT_OFFSET, 1, encodeOffOnBit(channel.autoscan));
    writeBitField(payload, base * 8 + CHANNEL_LONE_WORKER_BIT_OFFSET, 1, encodeOffOnBit(channel.loneWorker));
    writeBitField(payload, base * 8 + CHANNEL_VOX_BIT_OFFSET, 1, encodeOffOnBit(channel.vox));
    writeBitField(payload, base * 8 + CHANNEL_ALLOW_TALKAROUND_BIT_OFFSET, 1, encodeOffOnBit(channel.allowTalkaround));
    writeBitField(payload, base * 8 + CHANNEL_TALKAROUND_BIT_OFFSET, 1, encodeOnOffBit(channel.talkaround));
    writeBitField(payload, base * 8 + CHANNEL_PRIVATE_CALL_CONFIRMED_BIT_OFFSET, 1, encodeOffOnBit(channel.privateCallConfirmed));
    writeBitField(payload, base * 8 + CHANNEL_DATA_CALL_CONFIRMED_BIT_OFFSET, 1, encodeOffOnBit(channel.dataCallConfirmed));
    writeBitField(payload, base * 8 + CHANNEL_EMERGENCY_ALARM_ACK_BIT_OFFSET, 1, encodeOffOnBit(channel.emergencyAlarmAck));
    writeBitField(payload, base * 8 + CHANNEL_COMPRESSED_UDP_HEADER_BIT_OFFSET, 1, encodeOffOnBit(channel.compressedUdpDataHeader));
    writeBitField(payload, base * 8 + CHANNEL_DISPLAY_PTT_ID_BIT_OFFSET, 1, encodeOnOffBit(channel.displayPttId));
    writeBitField(payload, base * 8 + CHANNEL_PRIVACY_BIT_OFFSET, 2, encodePrivacy(channel.privacy));
    writeBitField(payload, base * 8 + CHANNEL_PRIVACY_NUMBER_BIT_OFFSET, 4, Math.max(0, Math.min(15, channel.privacyNumber - 1)));
    writeBitField(payload, base * 8 + CHANNEL_EMERGENCY_SYSTEM_BIT_OFFSET, 8, Math.max(0, Math.min(32, channel.emergencySystem)));
    writeBitField(payload, base * 8 + CHANNEL_TOT_BIT_OFFSET, 8, encodeTotSec(channel.totSec));
    writeBitField(payload, base * 8 + CHANNEL_TOT_REKEY_DELAY_BIT_OFFSET, 8, Math.max(0, Math.min(255, channel.totRekeyDelaySec)));
    writeBitField(payload, base * 8 + CHANNEL_RX_REF_FREQUENCY_BIT_OFFSET, 2, encodeRefFrequency(channel.rxRefFrequency));
    writeBitField(payload, base * 8 + CHANNEL_TX_REF_FREQUENCY_BIT_OFFSET, 2, encodeRefFrequency(channel.txRefFrequency));
    writeBitField(payload, base * 8 + CHANNEL_CTCSS_DECODE_BIT_OFFSET, 16, encodeCtcssDcs(channel.ctcssDecode));
    writeBitField(payload, base * 8 + CHANNEL_CTCSS_ENCODE_BIT_OFFSET, 16, encodeCtcssDcs(channel.ctcssEncode));
    writeBitField(payload, base * 8 + CHANNEL_QT_REVERSE_BIT_OFFSET, 1, channel.qtReverse === "120" ? 1 : 0);
    writeBitField(payload, base * 8 + CHANNEL_REVERSE_BURST_BIT_OFFSET, 1, encodeOffOnBit(channel.reverseBurst));
    writeBitField(payload, base * 8 + CHANNEL_DECODE1_BIT_OFFSET, 1, encodeOffOnBit(channel.decode1));
    writeBitField(payload, base * 8 + CHANNEL_DECODE2_BIT_OFFSET, 1, encodeOffOnBit(channel.decode2));
    writeBitField(payload, base * 8 + CHANNEL_DECODE3_BIT_OFFSET, 1, encodeOffOnBit(channel.decode3));
    writeBitField(payload, base * 8 + CHANNEL_DECODE4_BIT_OFFSET, 1, encodeOffOnBit(channel.decode4));
    writeBitField(payload, base * 8 + CHANNEL_DECODE5_BIT_OFFSET, 1, encodeOffOnBit(channel.decode5));
    writeBitField(payload, base * 8 + CHANNEL_DECODE6_BIT_OFFSET, 1, encodeOffOnBit(channel.decode6));
    writeBitField(payload, base * 8 + CHANNEL_DECODE7_BIT_OFFSET, 1, encodeOffOnBit(channel.decode7));
    writeBitField(payload, base * 8 + CHANNEL_DECODE8_BIT_OFFSET, 1, encodeOffOnBit(channel.decode8));
    writeBitField(payload, base * 8 + CHANNEL_DCDM_SWITCH_BIT_OFFSET, 1, encodeOnOffBit(channel.dcdmSwitch));
    writeBitField(payload, base * 8 + CHANNEL_LEADER_MS_BIT_OFFSET, 1, encodeOnOffBit(channel.leaderMs));
    writeBitField(payload, base * 8 + CHANNEL_ALLOW_INTERRUPT_BIT_OFFSET, 1, encodeOnOffBit(channel.allowInterrupt));
    writeBitField(payload, base * 8 + CHANNEL_RX_SIGNALLING_SYSTEM_BIT_OFFSET, 8, encodeSignallingSystem(channel.rxSignallingSystem));
    writeBitField(payload, base * 8 + CHANNEL_TX_SIGNALLING_SYSTEM_BIT_OFFSET, 8, encodeSignallingSystem(channel.txSignallingSystem));
    writeBitField(payload, base * 8 + CHANNEL_RECEIVE_GPS_INFO_BIT_OFFSET, 1, encodeOnOffBit(channel.receiveGpsInfo));
    writeBitField(payload, base * 8 + CHANNEL_SEND_GPS_INFO_BIT_OFFSET, 1, encodeOnOffBit(channel.sendGpsInfo));
    writeBitField(payload, base * 8 + CHANNEL_COLOR_CODE_BIT_OFFSET, 4, Math.min(15, Math.max(0, channel.colorCode)));
    writeBitField(payload, base * 8 + CHANNEL_SLOT_BIT_OFFSET, 2, encodeSlot(channel.repeaterSlot));
    writeBitField(payload, base * 8 + CHANNEL_POWER_BIT_OFFSET, 1, encodePower(channel.power));
    writeUcs2String(payload, base + CHANNEL_NAME_OFFSET, CHANNEL_NAME_SIZE, channel.name);
    const contactSlot = channel.contactId ? contactSlotById.get(channel.contactId) ?? 0 : 0;
    writeLittleInt(payload, base + CHANNEL_CONTACT_INDEX_OFFSET, 2, contactSlot);
    const scanListSlot = channel.scanListId ? scanListSlotById.get(channel.scanListId) ?? 0 : 0;
    const groupListSlot = channel.groupListId ? groupListSlotById.get(channel.groupListId) ?? 0 : 0;
    writeBitField(payload, base * 8 + CHANNEL_SCAN_LIST_INDEX_OFFSET * 8, 8, scanListSlot);
    writeBitField(payload, base * 8 + CHANNEL_GROUP_LIST_INDEX_OFFSET * 8, 8, groupListSlot);
  }

  return channelSlotById;
}

function buildChannelSignature(channel: Channel): string {
  const { _rawRecordHex: _ignoredRaw, _dirty: _ignoredDirty, _rawSignature: _ignoredSignature, ...rest } = channel;
  return JSON.stringify(rest);
}

function writeZones(payload: Uint8Array, document: CodeplugDocument, channelSlotById: Map<number, number>): void {
  const zoneSlotById = resolveSlots(document.zones, ZONES_MAX);
  const activeSlots = new Set<number>(zoneSlotById.values());

  for (let slot = 1; slot <= ZONES_MAX; slot += 1) {
    const base = ZONES_OFFSET + (slot - 1) * ZONES_RECORD_SIZE;
    if (base + ZONES_RECORD_SIZE > payload.byteLength) {
      break;
    }

    if (!activeSlots.has(slot)) {
      const hasName = readUcs2String(payload, base + ZONE_NAME_OFFSET, ZONE_NAME_SIZE).length > 0;
      if (hasName) {
        payload[base + ZONES_DELETED_OFFSET] = 0;
      }
      continue;
    }

    const zone = document.zones.find((item) => zoneSlotById.get(item.id) === slot);
    if (!zone) {
      continue;
    }

    writeUcs2String(payload, base + ZONE_NAME_OFFSET, ZONE_NAME_SIZE, zone.name);
    for (let channelIndex = 0; channelIndex < ZONE_CHANNELS_MAX; channelIndex += 1) {
      const channelId = zone.channelIds[channelIndex];
      const channelSlot = channelId ? channelSlotById.get(channelId) ?? 0 : 0;
      writeLittleInt(payload, base + ZONE_CHANNELS_OFFSET + channelIndex * 2, 2, channelSlot);
    }
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

function validateInput(fileName: string, bytes: Uint8Array): void {
  if (bytes.byteLength === 0) {
    throw new CodeplugParseError("File is empty. Please select a valid .rdt or .bin codeplug.");
  }

  const format = detectFormat(fileName);
  if (format === "rdt") {
    if (bytes.byteLength !== KNOWN_RDT_SIZE) {
      throw new CodeplugParseError(
        `Unsupported .rdt size (${bytes.byteLength} bytes). Expected ${KNOWN_RDT_SIZE} bytes for MD380/MD390 class files.`,
      );
    }

    const magic = String.fromCharCode(...bytes.slice(0, 5));
    if (magic !== "DfuSe") {
      throw new CodeplugParseError("Invalid .rdt file header. Expected DfuSe signature.");
    }
    return;
  }

  if (format === "bin") {
    if (bytes.byteLength !== KNOWN_RAW_SIZE) {
      throw new CodeplugParseError(
        `Unsupported .bin size (${bytes.byteLength} bytes). Expected ${KNOWN_RAW_SIZE} bytes for MD380/MD390 class files.`,
      );
    }
    return;
  }

  throw new CodeplugParseError(".dfu import is not supported in-browser yet. Use .rdt or .bin files.");
}

export function parseCodeplug(fileName: string, bytes: Uint8Array): CodeplugDocument {
  validateInput(fileName, bytes);

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
  const groupLists = [];
  const scanLists = [];

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
      slot: index + 1,
    });
  }

  for (let index = 0; index < GROUP_LISTS_MAX; index += 1) {
    const base = GROUP_LISTS_OFFSET + index * GROUP_LISTS_RECORD_SIZE;
    if (base + GROUP_LISTS_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base + GROUP_LISTS_DELETED_OFFSET] === 0) {
      continue;
    }
    const name = readUcs2String(payload, base + GROUP_LIST_NAME_OFFSET, GROUP_LIST_NAME_SIZE);
    if (!name) {
      continue;
    }
    groupLists.push({
      id: groupLists.length + 1,
      name,
      slot: index + 1,
    });
  }

  for (let index = 0; index < SCAN_LISTS_MAX; index += 1) {
    const base = SCAN_LISTS_OFFSET + index * SCAN_LISTS_RECORD_SIZE;
    if (base + SCAN_LISTS_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base + SCAN_LISTS_DELETED_OFFSET] === 0) {
      continue;
    }
    const name = readUcs2String(payload, base + SCAN_LIST_NAME_OFFSET, SCAN_LIST_NAME_SIZE);
    if (!name) {
      continue;
    }
    scanLists.push({
      id: scanLists.length + 1,
      name,
      slot: index + 1,
    });
  }

  const groupListSlotToId = new Map<number, number>();
  for (const groupList of groupLists) {
    if (groupList.slot) {
      groupListSlotToId.set(groupList.slot, groupList.id);
    }
  }

  const scanListSlotToId = new Map<number, number>();
  for (const scanList of scanLists) {
    if (scanList.slot) {
      scanListSlotToId.set(scanList.slot, scanList.id);
    }
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
    const scanRef = readBitField(payload, base * 8 + CHANNEL_SCAN_LIST_INDEX_OFFSET * 8, 8);
    const groupRef = readBitField(payload, base * 8 + CHANNEL_GROUP_LIST_INDEX_OFFSET * 8, 8);
    const logicalId = channels.length + 1;
    channelSlotToLogicalId.set(index + 1, logicalId);

    const rxFrequencyMHz = readFrequencyMHz(payload, base + CHANNEL_RX_FREQ_OFFSET);
    const txFrequencyMHz = readFrequencyMHz(payload, base + CHANNEL_TX_FREQ_OFFSET);

    const parsedChannel: Channel = {
      id: logicalId,
      name,
      contactId,
      scanListId: scanRef > 0 ? scanListSlotToId.get(scanRef) : undefined,
      groupListId: groupRef > 0 ? groupListSlotToId.get(groupRef) : undefined,
      rxFrequencyMHz,
      txFrequencyMHz,
      txOffsetMHz: Number((txFrequencyMHz - rxFrequencyMHz).toFixed(5)),
      channelMode: parseMode(readBitField(payload, base * 8 + CHANNEL_MODE_BIT_OFFSET, 2)),
      admitCriteria: decodeAdmitCriteria(readBitField(payload, base * 8 + CHANNEL_ADMIT_CRITERIA_BIT_OFFSET, 2)),
      inCallCriteria: decodeInCallCriteria(readBitField(payload, base * 8 + CHANNEL_IN_CALL_CRITERIA_BIT_OFFSET, 1)),
      rxOnly: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_RX_ONLY_BIT_OFFSET, 1)),
      autoscan: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_AUTOSCAN_BIT_OFFSET, 1)),
      loneWorker: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_LONE_WORKER_BIT_OFFSET, 1)),
      vox: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_VOX_BIT_OFFSET, 1)),
      allowTalkaround: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_ALLOW_TALKAROUND_BIT_OFFSET, 1)),
      talkaround: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_TALKAROUND_BIT_OFFSET, 1)),
      privateCallConfirmed: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_PRIVATE_CALL_CONFIRMED_BIT_OFFSET, 1)),
      dataCallConfirmed: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DATA_CALL_CONFIRMED_BIT_OFFSET, 1)),
      emergencyAlarmAck: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_EMERGENCY_ALARM_ACK_BIT_OFFSET, 1)),
      compressedUdpDataHeader: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_COMPRESSED_UDP_HEADER_BIT_OFFSET, 1)),
      displayPttId: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_DISPLAY_PTT_ID_BIT_OFFSET, 1)),
      privacy: decodePrivacy(readBitField(payload, base * 8 + CHANNEL_PRIVACY_BIT_OFFSET, 2)),
      privacyNumber: readBitField(payload, base * 8 + CHANNEL_PRIVACY_NUMBER_BIT_OFFSET, 4) + 1,
      emergencySystem: readBitField(payload, base * 8 + CHANNEL_EMERGENCY_SYSTEM_BIT_OFFSET, 8),
      totSec: decodeTotSec(readBitField(payload, base * 8 + CHANNEL_TOT_BIT_OFFSET, 8)),
      totRekeyDelaySec: readBitField(payload, base * 8 + CHANNEL_TOT_REKEY_DELAY_BIT_OFFSET, 8),
      rxRefFrequency: decodeRefFrequency(readBitField(payload, base * 8 + CHANNEL_RX_REF_FREQUENCY_BIT_OFFSET, 2)),
      txRefFrequency: decodeRefFrequency(readBitField(payload, base * 8 + CHANNEL_TX_REF_FREQUENCY_BIT_OFFSET, 2)),
      ctcssDecode: decodeCtcssDcs(readBitField(payload, base * 8 + CHANNEL_CTCSS_DECODE_BIT_OFFSET, 16)),
      ctcssEncode: decodeCtcssDcs(readBitField(payload, base * 8 + CHANNEL_CTCSS_ENCODE_BIT_OFFSET, 16)),
      qtReverse: readBitField(payload, base * 8 + CHANNEL_QT_REVERSE_BIT_OFFSET, 1) === 1 ? "120" : "180",
      reverseBurst: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_REVERSE_BURST_BIT_OFFSET, 1)),
      decode1: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE1_BIT_OFFSET, 1)),
      decode2: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE2_BIT_OFFSET, 1)),
      decode3: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE3_BIT_OFFSET, 1)),
      decode4: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE4_BIT_OFFSET, 1)),
      decode5: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE5_BIT_OFFSET, 1)),
      decode6: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE6_BIT_OFFSET, 1)),
      decode7: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE7_BIT_OFFSET, 1)),
      decode8: parseOffOnBit(readBitField(payload, base * 8 + CHANNEL_DECODE8_BIT_OFFSET, 1)),
      dcdmSwitch: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_DCDM_SWITCH_BIT_OFFSET, 1)),
      leaderMs: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_LEADER_MS_BIT_OFFSET, 1)),
      allowInterrupt: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_ALLOW_INTERRUPT_BIT_OFFSET, 1)),
      nonQtDqtTurnoffFreq: decodeDqtTurnoffFreq(readBitField(payload, base * 8 + CHANNEL_DQTTURNOFF_FREQ_BIT_OFFSET, 2)),
      rxSignallingSystem: decodeSignallingSystem(readBitField(payload, base * 8 + CHANNEL_RX_SIGNALLING_SYSTEM_BIT_OFFSET, 8)),
      txSignallingSystem: decodeSignallingSystem(readBitField(payload, base * 8 + CHANNEL_TX_SIGNALLING_SYSTEM_BIT_OFFSET, 8)),
      receiveGpsInfo: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_RECEIVE_GPS_INFO_BIT_OFFSET, 1)),
      sendGpsInfo: parseOnOffBit(readBitField(payload, base * 8 + CHANNEL_SEND_GPS_INFO_BIT_OFFSET, 1)),
      colorCode: readBitField(payload, base * 8 + CHANNEL_COLOR_CODE_BIT_OFFSET, 4),
      repeaterSlot: parseSlot(readBitField(payload, base * 8 + CHANNEL_SLOT_BIT_OFFSET, 2)),
      bandwidthKhz: parseBandwidth(readBitField(payload, base * 8 + CHANNEL_BANDWIDTH_BIT_OFFSET, 2)),
      power: parsePower(readBitField(payload, base * 8 + CHANNEL_POWER_BIT_OFFSET, 1)),
      slot: index + 1,
      _rawRecordHex: readHexString(payload, base, CHANNELS_RECORD_SIZE),
      _dirty: false,
    };
    parsedChannel._rawSignature = buildChannelSignature(parsedChannel);
    channels.push(parsedChannel);
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
      slot: index + 1,
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

  const voxSensitivity =
    settingsBase + 96 <= payload.byteLength
      ? readBitField(payload, settingsBase * 8 + VOX_SENSITIVITY_BIT_OFFSET, 8)
      : 1;
  const txPreambleDurationMs =
    settingsBase + 96 <= payload.byteLength
      ? readBitField(payload, settingsBase * 8 + TX_PREAMBLE_DURATION_BIT_OFFSET, 8) * 60
      : 600;
  const rxLowBatteryIntervalSec =
    settingsBase + 96 <= payload.byteLength
      ? readBitField(payload, settingsBase * 8 + RX_LOW_BATTERY_INTERVAL_BIT_OFFSET, 8) * 5
      : 15;
  const backlightTimeoutSec =
    settingsBase + 96 <= payload.byteLength
      ? decodeBacklightTimeout(readBitField(payload, settingsBase * 8 + BACKLIGHT_TIMEOUT_BIT_OFFSET, 2))
      : "Always";
  const keypadAutoLockSec =
    settingsBase + 96 <= payload.byteLength
      ? decodeKeypadAutoLock(readBitField(payload, settingsBase * 8 + KEYPAD_AUTO_LOCK_BIT_OFFSET, 8))
      : "Manual";
  const alertTones =
    settingsBase + 96 <= payload.byteLength
      ? readBitField(payload, settingsBase * 8 + DISABLE_ALL_TONES_BIT_OFFSET, 1) === 0
        ? "Off"
        : "On"
      : "On";
  const timeZone =
    settingsBase + 108 <= payload.byteLength
      ? decodeTimeZone(readBitField(payload, settingsBase * 8 + TIME_ZONE_BIT_OFFSET, 5))
      : "UTC+0:00";
  const bootUpMessageLine1 =
    settingsBase + INTRO_SCREEN_LINE1_OFFSET + INTRO_SCREEN_LINE_SIZE <= payload.byteLength
      ? readUcs2String(payload, settingsBase + INTRO_SCREEN_LINE1_OFFSET, INTRO_SCREEN_LINE_SIZE)
      : "";
  const bootUpMessageLine2 =
    settingsBase + INTRO_SCREEN_LINE2_OFFSET + INTRO_SCREEN_LINE_SIZE <= payload.byteLength
      ? readUcs2String(payload, settingsBase + INTRO_SCREEN_LINE2_OFFSET, INTRO_SCREEN_LINE_SIZE)
      : "";

  const menuBase = MENU_SETTINGS_OFFSET;
  const menuSettings = {
    hangTime:
      menuBase + 5 <= payload.byteLength
        ? parseMenuHangTime(readBitField(payload, menuBase * 8 + MENU_HANG_TIME_BIT_OFFSET, 8))
        : "10",
    radioDisable:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_RADIO_DISABLE_BIT_OFFSET, 1))
        : "Off",
    radioEnable:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_RADIO_ENABLE_BIT_OFFSET, 1))
        : "Off",
    remoteMonitor:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_REMOTE_MONITOR_BIT_OFFSET, 1))
        : "Off",
    radioCheck:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_RADIO_CHECK_BIT_OFFSET, 1))
        : "Off",
    manualDial:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_MANUAL_DIAL_BIT_OFFSET, 1))
        : "On",
    edit:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_EDIT_BIT_OFFSET, 1))
        : "On",
    callAlert:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_CALL_ALERT_BIT_OFFSET, 1))
        : "On",
    textMessage:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_TEXT_MESSAGE_BIT_OFFSET, 1))
        : "On",
    toneOrAlert:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_TONE_OR_ALERT_BIT_OFFSET, 1))
        : "On",
    talkaround:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_TALKAROUND_BIT_OFFSET, 1))
        : "On",
    outgoingRadio:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_OUTGOING_RADIO_BIT_OFFSET, 1))
        : "On",
    answered:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_ANSWERED_BIT_OFFSET, 1))
        : "On",
    missed:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_MISSED_BIT_OFFSET, 1))
        : "On",
    editList:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_EDIT_LIST_BIT_OFFSET, 1))
        : "On",
    scan:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_SCAN_BIT_OFFSET, 1))
        : "On",
    programKey:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_PROGRAM_KEY_BIT_OFFSET, 1))
        : "On",
    vox:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_VOX_BIT_OFFSET, 1))
        : "Off",
    squelch:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_SQUELCH_BIT_OFFSET, 1))
        : "On",
    ledIndicator:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_LED_INDICATOR_BIT_OFFSET, 1))
        : "On",
    keyboardLock:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_KEYBOARD_LOCK_BIT_OFFSET, 1))
        : "On",
    introScreen:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_INTRO_SCREEN_BIT_OFFSET, 1))
        : "On",
    backlight:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_BACKLIGHT_BIT_OFFSET, 1))
        : "On",
    power:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_POWER_BIT_OFFSET, 1))
        : "On",
    gps:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_GPS_BIT_OFFSET, 1))
        : "Off",
    programRadio:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_PROGRAM_RADIO_BIT_OFFSET, 1))
        : "Off",
    displayMode:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_DISPLAY_MODE_BIT_OFFSET, 1))
        : "On",
    passwordAndLock:
      menuBase + 5 <= payload.byteLength
        ? parseOffOnBit(readBitField(payload, menuBase * 8 + MENU_PASSWORD_AND_LOCK_BIT_OFFSET, 1))
        : "On",
  };

  const radioButtons = [];
  for (let index = 0; index < RADIO_BUTTONS_MAX; index += 1) {
    const offset = RADIO_BUTTONS_OFFSET + index;
    if (offset >= payload.byteLength) {
      break;
    }
    const actionCode = payload[offset];
    radioButtons.push({
      id: index + 1,
      name:
        index === 0
          ? "Side Button 1 Short Press"
          : index === 1
            ? "Side Button 1 Long Press"
            : index === 2
              ? "Side Button 2 Short Press"
              : "Side Button 2 Long Press",
      actionCode,
    });
  }

  const longPressDurationMs =
    BUTTON_DEFINITIONS_OFFSET < payload.byteLength
      ? Math.max(4, Math.min(15, payload[BUTTON_DEFINITIONS_OFFSET])) * 250
      : 1000;

  const textMessages = [];
  for (let index = 0; index < TEXT_MESSAGES_MAX; index += 1) {
    const base = TEXT_MESSAGES_OFFSET + index * TEXT_MESSAGE_RECORD_SIZE;
    if (base + TEXT_MESSAGE_RECORD_SIZE > payload.byteLength) {
      break;
    }
    if (payload[base] === 0) {
      continue;
    }
    const text = readUcs2String(payload, base, TEXT_MESSAGE_RECORD_SIZE);
    if (!text) {
      continue;
    }
    textMessages.push({ id: textMessages.length + 1, text, slot: index + 1 });
  }

  const privacySettings = {
    enhancedKeys: [] as string[],
    basicKeys: [] as string[],
  };
  for (let index = 0; index < PRIVACY_ENHANCED_KEYS_MAX; index += 1) {
    const offset = PRIVACY_SETTINGS_OFFSET + index * PRIVACY_ENHANCED_KEY_SIZE;
    if (offset + PRIVACY_ENHANCED_KEY_SIZE > payload.byteLength) {
      break;
    }
    privacySettings.enhancedKeys.push(readHexString(payload, offset, PRIVACY_ENHANCED_KEY_SIZE));
  }
  for (let index = 0; index < PRIVACY_BASIC_KEYS_MAX; index += 1) {
    const offset = PRIVACY_SETTINGS_OFFSET + PRIVACY_BASIC_KEYS_OFFSET + index * PRIVACY_BASIC_KEY_SIZE;
    if (offset + PRIVACY_BASIC_KEY_SIZE > payload.byteLength) {
      break;
    }
    privacySettings.basicKeys.push(readHexString(payload, offset, PRIVACY_BASIC_KEY_SIZE));
  }

  const frequencyRangeIndex =
    BASIC_INFO_OFFSET + Math.floor(BASIC_FREQUENCY_RANGE_BIT_OFFSET / 8) < payload.byteLength
      ? readBitField(payload, BASIC_INFO_OFFSET * 8 + BASIC_FREQUENCY_RANGE_BIT_OFFSET, 8)
      : -1;
  const lowFrequencyMHz = parseBiFrequencyMHz(payload, BASIC_LOW_FREQUENCY_OFFSET);
  const highFrequencyMHz = parseBiFrequencyMHz(payload, BASIC_HIGH_FREQUENCY_OFFSET);
  const cpsVersion = readNibbleDecimalString(payload, BASIC_CPS_VERSION_OFFSET, BASIC_CPS_VERSION_SIZE);
  const lastProgrammedTime = formatLastProgrammedTime(
    readBcdDigitString(payload, BASIC_LAST_PROGRAMMED_TIME_OFFSET, BASIC_LAST_PROGRAMMED_TIME_SIZE),
  );
  const frequencyRange =
    frequencyRangeIndex >= 0 && frequencyRangeIndex < FREQUENCY_RANGE_OPTIONS.length
      ? FREQUENCY_RANGE_OPTIONS[frequencyRangeIndex]
      : lowFrequencyMHz > 0 && highFrequencyMHz > 0
        ? `${lowFrequencyMHz.toFixed(1)}-${highFrequencyMHz.toFixed(1)}`
        : "Unknown";

  const byModel = detectVariantFromModel(model);
  if (model.trim().length > 0 && byModel === "unknown") {
    throw new CodeplugParseError(`Unsupported radio model '${model}'. This build supports MD380/RT3 and MD390/RT8 variants.`);
  }

  return {
    fileName,
    format: detectFormat(fileName),
    variant: byModel === "unknown" ? detectVariantFromSize(bytes.byteLength) : byModel,
    sourceSize: bytes.byteLength,
    outputFileName: outputNameFor(fileName),
    payloadOffset: layout.payloadOffset,
    payloadLength: layout.payloadLength,
    model,
    basicInfo: {
      firmwareVersion: "Not stored in codeplug",
      cpsVersion,
      mcuVersion: "Not stored in codeplug",
      uniqueDeviceId: "Not stored in codeplug",
      frequencyRange,
      lastProgrammedTime,
    },
    channels,
    zones,
    contacts,
    groupLists,
    scanLists,
    settings: {
      radioId,
      radioName,
      voxSensitivity,
      txPreambleDurationMs,
      rxLowBatteryIntervalSec,
      backlightTimeoutSec,
      keypadAutoLockSec,
      bootUpMessageLine1,
      bootUpMessageLine2,
      alertTones,
      timeZone,
    },
    menuSettings,
    radioButtons,
    longPressDurationMs,
    textMessages,
    privacySettings,
  };
}

export function serializeCodeplug(document: CodeplugDocument, originalBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(originalBytes);
  const payload = out.subarray(document.payloadOffset, document.payloadOffset + document.payloadLength);

  const settingsBase = GENERAL_SETTINGS_OFFSET;

  if (settingsBase + INTRO_SCREEN_LINE1_OFFSET + INTRO_SCREEN_LINE_SIZE <= payload.byteLength) {
    writeUcs2String(
      payload,
      settingsBase + INTRO_SCREEN_LINE1_OFFSET,
      INTRO_SCREEN_LINE_SIZE,
      document.settings.bootUpMessageLine1,
    );
  }
  if (settingsBase + INTRO_SCREEN_LINE2_OFFSET + INTRO_SCREEN_LINE_SIZE <= payload.byteLength) {
    writeUcs2String(
      payload,
      settingsBase + INTRO_SCREEN_LINE2_OFFSET,
      INTRO_SCREEN_LINE_SIZE,
      document.settings.bootUpMessageLine2,
    );
  }

  if (GENERAL_SETTINGS_OFFSET + RADIO_ID_OFFSET + RADIO_ID_SIZE <= payload.byteLength) {
    writeLittleInt(payload, GENERAL_SETTINGS_OFFSET + RADIO_ID_OFFSET, RADIO_ID_SIZE, document.settings.radioId);
  }
  if (GENERAL_SETTINGS_OFFSET + RADIO_NAME_OFFSET + RADIO_NAME_SIZE <= payload.byteLength) {
    writeUcs2String(payload, GENERAL_SETTINGS_OFFSET + RADIO_NAME_OFFSET, RADIO_NAME_SIZE, document.settings.radioName);
  }

  if (settingsBase + 108 <= payload.byteLength) {
    writeBitField(
      payload,
      settingsBase * 8 + DISABLE_ALL_TONES_BIT_OFFSET,
      1,
      document.settings.alertTones === "On" ? 1 : 0,
    );
    writeBitField(
      payload,
      settingsBase * 8 + TX_PREAMBLE_DURATION_BIT_OFFSET,
      8,
      Math.max(0, Math.min(144, Math.round(document.settings.txPreambleDurationMs / 60))),
    );
    writeBitField(
      payload,
      settingsBase * 8 + VOX_SENSITIVITY_BIT_OFFSET,
      8,
      Math.max(1, Math.min(10, Math.round(document.settings.voxSensitivity))),
    );
    writeBitField(
      payload,
      settingsBase * 8 + RX_LOW_BATTERY_INTERVAL_BIT_OFFSET,
      8,
      Math.max(0, Math.min(127, Math.round(document.settings.rxLowBatteryIntervalSec / 5))),
    );
    writeBitField(
      payload,
      settingsBase * 8 + BACKLIGHT_TIMEOUT_BIT_OFFSET,
      2,
      encodeBacklightTimeout(document.settings.backlightTimeoutSec),
    );
    writeBitField(
      payload,
      settingsBase * 8 + KEYPAD_AUTO_LOCK_BIT_OFFSET,
      8,
      encodeKeypadAutoLock(document.settings.keypadAutoLockSec),
    );
    writeBitField(payload, settingsBase * 8 + TIME_ZONE_BIT_OFFSET, 5, encodeTimeZone(document.settings.timeZone));
  }

  if (MENU_SETTINGS_OFFSET + 5 <= payload.byteLength) {
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_HANG_TIME_BIT_OFFSET, 8, encodeMenuHangTime(document.menuSettings.hangTime));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_RADIO_DISABLE_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.radioDisable));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_RADIO_ENABLE_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.radioEnable));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_REMOTE_MONITOR_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.remoteMonitor));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_RADIO_CHECK_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.radioCheck));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_MANUAL_DIAL_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.manualDial));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_EDIT_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.edit));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_CALL_ALERT_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.callAlert));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_TEXT_MESSAGE_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.textMessage));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_TONE_OR_ALERT_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.toneOrAlert));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_TALKAROUND_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.talkaround));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_OUTGOING_RADIO_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.outgoingRadio));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_ANSWERED_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.answered));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_MISSED_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.missed));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_EDIT_LIST_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.editList));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_SCAN_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.scan));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_PROGRAM_KEY_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.programKey));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_VOX_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.vox));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_SQUELCH_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.squelch));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_LED_INDICATOR_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.ledIndicator));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_KEYBOARD_LOCK_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.keyboardLock));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_INTRO_SCREEN_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.introScreen));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_BACKLIGHT_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.backlight));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_POWER_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.power));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_GPS_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.gps));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_PROGRAM_RADIO_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.programRadio));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_DISPLAY_MODE_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.displayMode));
    writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_PASSWORD_AND_LOCK_BIT_OFFSET, 1, encodeOffOnBit(document.menuSettings.passwordAndLock));
  }

  if (BUTTON_DEFINITIONS_OFFSET < payload.byteLength) {
    payload[BUTTON_DEFINITIONS_OFFSET] = Math.max(4, Math.min(15, Math.round(document.longPressDurationMs / 250)));
  }

  for (let index = 0; index < RADIO_BUTTONS_MAX; index += 1) {
    const offset = RADIO_BUTTONS_OFFSET + index;
    if (offset >= payload.byteLength) {
      break;
    }
    const assignment = document.radioButtons.find((item) => item.id === index + 1);
    payload[offset] = assignment ? Math.max(0, Math.min(255, assignment.actionCode)) : 0;
  }

  for (const message of document.textMessages) {
    if (!message.slot || message.slot < 1 || message.slot > TEXT_MESSAGES_MAX) {
      continue;
    }
    const base = TEXT_MESSAGES_OFFSET + (message.slot - 1) * TEXT_MESSAGE_RECORD_SIZE;
    if (base + TEXT_MESSAGE_RECORD_SIZE > payload.byteLength) {
      continue;
    }
    writeUcs2String(payload, base, TEXT_MESSAGE_RECORD_SIZE, message.text);
  }

  for (let index = 0; index < PRIVACY_ENHANCED_KEYS_MAX; index += 1) {
    const offset = PRIVACY_SETTINGS_OFFSET + index * PRIVACY_ENHANCED_KEY_SIZE;
    if (offset + PRIVACY_ENHANCED_KEY_SIZE > payload.byteLength) {
      break;
    }
    writeHexString(payload, offset, PRIVACY_ENHANCED_KEY_SIZE, document.privacySettings.enhancedKeys[index] ?? "");
  }

  for (let index = 0; index < PRIVACY_BASIC_KEYS_MAX; index += 1) {
    const offset = PRIVACY_SETTINGS_OFFSET + PRIVACY_BASIC_KEYS_OFFSET + index * PRIVACY_BASIC_KEY_SIZE;
    if (offset + PRIVACY_BASIC_KEY_SIZE > payload.byteLength) {
      break;
    }
    writeHexString(payload, offset, PRIVACY_BASIC_KEY_SIZE, document.privacySettings.basicKeys[index] ?? "");
  }

  if (BASIC_CPS_VERSION_OFFSET + BASIC_CPS_VERSION_SIZE <= payload.byteLength) {
    writeNibbleDecimalString(payload, BASIC_CPS_VERSION_OFFSET, BASIC_CPS_VERSION_SIZE, document.basicInfo.cpsVersion);
  }
  if (Math.floor(BASIC_FREQUENCY_RANGE_BIT_OFFSET / 8) < payload.byteLength) {
    const rangeIndex = FREQUENCY_RANGE_OPTIONS.indexOf(document.basicInfo.frequencyRange as (typeof FREQUENCY_RANGE_OPTIONS)[number]);
    if (rangeIndex >= 0) {
      writeBitField(payload, BASIC_INFO_OFFSET * 8 + BASIC_FREQUENCY_RANGE_BIT_OFFSET, 8, rangeIndex);
    }
  }

  const contactSlotById = writeContacts(payload, document);
  const channelSlotById = writeChannels(payload, document, contactSlotById);
  writeZones(payload, document, channelSlotById);

  return out;
}

export function radioButtonActionOptions(): Array<{ code: number; label: string }> {
  return RADIO_BUTTON_ACTIONS.map((item) => ({ code: item.code, label: item.label }));
}

export function radioButtonActionLabel(code: number): string {
  return labelForRadioButtonAction(code);
}
