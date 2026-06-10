import { describe, expect, it } from "vitest";

import { parseCodeplug, serializeCodeplug } from "./parser";

const PAYLOAD_SIZE = 262144;
const RDT_HEADER_SIZE = 549;
const RDT_SIZE = 262709;

const GENERAL_SETTINGS_OFFSET = 8256;
const MENU_SETTINGS_OFFSET = 8981;
const RADIO_BUTTONS_OFFSET = 8999;
const BUTTON_DEFINITIONS_OFFSET = 9014;
const TEXT_MESSAGES_OFFSET = 9125;
const TEXT_MESSAGES_OFFSET_ALT = TEXT_MESSAGES_OFFSET - RDT_HEADER_SIZE;
const TEXT_MESSAGE_RECORD_SIZE = 288;
const PRIVACY_SETTINGS_OFFSET = 23525;
const PRIVACY_BASIC_KEYS_OFFSET = 144;
const RADIO_ID_OFFSET = 68;
const RADIO_NAME_OFFSET = 112;
const INTRO_LINE1_OFFSET = 0;
const INTRO_LINE2_OFFSET = 20;
const DISABLE_ALL_TONES_BIT_OFFSET = 525;
const TX_PREAMBLE_DURATION_BIT_OFFSET = 576;
const VOX_SENSITIVITY_BIT_OFFSET = 600;
const RX_LOW_BATTERY_INTERVAL_BIT_OFFSET = 624;
const BACKLIGHT_TIMEOUT_BIT_OFFSET = 686;
const KEYPAD_AUTO_LOCK_BIT_OFFSET = 688;
const TIME_ZONE_BIT_OFFSET = 856;

const MENU_HANG_TIME_BIT_OFFSET = 0;
const MENU_RADIO_DISABLE_BIT_OFFSET = 8;
const MENU_SCAN_BIT_OFFSET = 22;
const MENU_PASSWORD_AND_LOCK_BIT_OFFSET = 39;

const CONTACTS_OFFSET = 24448;
const CONTACT_RECORD_SIZE = 36;
const CONTACT_CALL_ID_OFFSET = 0;
const CONTACT_NAME_OFFSET = 4;

const CHANNELS_OFFSET = 126464;
const CHANNEL_RECORD_SIZE = 64;
const CHANNEL_CONTACT_INDEX_OFFSET = 6;
const CHANNEL_RX_FREQ_OFFSET = 16;
const CHANNEL_TX_FREQ_OFFSET = 20;
const CHANNEL_NAME_OFFSET = 32;
const CHANNEL_BANDWIDTH_BIT_OFFSET = 4;
const CHANNEL_MODE_BIT_OFFSET = 6;
const CHANNEL_COLOR_CODE_BIT_OFFSET = 8;
const CHANNEL_SLOT_BIT_OFFSET = 12;
const CHANNEL_POWER_BIT_OFFSET = 34;

const ZONES_OFFSET = 84448;
const ZONE_RECORD_SIZE = 64;
const ZONE_NAME_OFFSET = 0;
const ZONE_CHANNELS_OFFSET = 32;

const MODEL_NAME_OFFSET = 293;
const FREQUENCY_RANGE_BIT_OFFSET = 2480;
const LAST_PROGRAMMED_TIME_OFFSET = 8742;
const CPS_VERSION_OFFSET = 8749;

function writeLittleInt(bytes: Uint8Array, offset: number, size: number, value: number): void {
  for (let index = 0; index < size; index += 1) {
    bytes[offset + index] = Math.floor(value / 2 ** (index * 8)) & 0xff;
  }
}

function writeUcs2(bytes: Uint8Array, offset: number, length: number, value: string): void {
  bytes.fill(0, offset, offset + length);
  const maxChars = Math.floor(length / 2);
  const safe = value.slice(0, maxChars);
  for (let index = 0; index < safe.length; index += 1) {
    const code = safe.charCodeAt(index);
    bytes[offset + index * 2] = code & 0xff;
    bytes[offset + index * 2 + 1] = (code >> 8) & 0xff;
  }
}

function writeDecimalNibbles(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const digit = Number.parseInt(value[index], 10);
    bytes[offset + index] = Number.isNaN(digit) ? 0 : digit;
  }
}

function writeBcdTimestamp(bytes: Uint8Array, offset: number, digits14: string): void {
  for (let index = 0; index < digits14.length / 2; index += 1) {
    const high = Number.parseInt(digits14[index * 2], 10) & 0x0f;
    const low = Number.parseInt(digits14[index * 2 + 1], 10) & 0x0f;
    bytes[offset + index] = (high << 4) | low;
  }
}

function writeHex(bytes: Uint8Array, offset: number, hex: string): void {
  const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, "");
  const even = clean.length % 2 === 0 ? clean : `${clean}0`;
  for (let index = 0; index < even.length / 2; index += 1) {
    bytes[offset + index] = Number.parseInt(even.slice(index * 2, index * 2 + 2), 16);
  }
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

function writeFrequencyMHz(bytes: Uint8Array, offset: number, mhz: number): void {
  writeLittleInt(bytes, offset, 4, intToBcd(Math.round(mhz * 100000)));
}

function writeBitField(bytes: Uint8Array, bitOffset: number, bitSize: number, value: number): void {
  const byteOffset = Math.floor(bitOffset / 8);
  let mask = (1 << bitSize) - 1;
  let shiftedValue = value;
  const rightOffset = (bitOffset + bitSize) % 8;
  if (rightOffset !== 0) {
    mask <<= 8 - rightOffset;
    shiftedValue <<= 8 - rightOffset;
  }
  bytes[byteOffset] = (bytes[byteOffset] & (~mask & 0xff)) | (shiftedValue & mask);
}

function buildPayloadFixture(model: string = "MD380"): Uint8Array {
  const payload = new Uint8Array(PAYLOAD_SIZE);

  for (let index = 0; index < model.length; index += 1) {
    payload[MODEL_NAME_OFFSET + index] = model.charCodeAt(index);
  }

  writeLittleInt(payload, GENERAL_SETTINGS_OFFSET + RADIO_ID_OFFSET, 3, 1234567);
  writeUcs2(payload, GENERAL_SETTINGS_OFFSET + RADIO_NAME_OFFSET, 32, "TEST-RADIO");
  writeUcs2(payload, GENERAL_SETTINGS_OFFSET + INTRO_LINE1_OFFSET, 20, "HELLO");
  writeUcs2(payload, GENERAL_SETTINGS_OFFSET + INTRO_LINE2_OFFSET, 20, "WORLD");
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + DISABLE_ALL_TONES_BIT_OFFSET, 1, 1);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + TX_PREAMBLE_DURATION_BIT_OFFSET, 8, 10);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + VOX_SENSITIVITY_BIT_OFFSET, 8, 7);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + RX_LOW_BATTERY_INTERVAL_BIT_OFFSET, 8, 6);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + BACKLIGHT_TIMEOUT_BIT_OFFSET, 2, 2);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + KEYPAD_AUTO_LOCK_BIT_OFFSET, 8, 10);
  writeBitField(payload, GENERAL_SETTINGS_OFFSET * 8 + TIME_ZONE_BIT_OFFSET, 5, 20);

  writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_HANG_TIME_BIT_OFFSET, 8, 12);
  writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_RADIO_DISABLE_BIT_OFFSET, 1, 1);
  writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_SCAN_BIT_OFFSET, 1, 0);
  writeBitField(payload, MENU_SETTINGS_OFFSET * 8 + MENU_PASSWORD_AND_LOCK_BIT_OFFSET, 1, 1);

  payload[RADIO_BUTTONS_OFFSET] = 14;
  payload[RADIO_BUTTONS_OFFSET + 1] = 4;
  payload[RADIO_BUTTONS_OFFSET + 2] = 5;
  payload[RADIO_BUTTONS_OFFSET + 3] = 23;
  payload[BUTTON_DEFINITIONS_OFFSET] = 5;

  writeUcs2(payload, TEXT_MESSAGES_OFFSET, TEXT_MESSAGE_RECORD_SIZE, "Test message A");
  writeUcs2(payload, TEXT_MESSAGES_OFFSET + TEXT_MESSAGE_RECORD_SIZE, TEXT_MESSAGE_RECORD_SIZE, "Test message B");

  writeHex(payload, PRIVACY_SETTINGS_OFFSET, "00112233445566778899aabbccddeeff");
  writeHex(payload, PRIVACY_SETTINGS_OFFSET + 16, "ffeeddccbbaa99887766554433221100");
  writeHex(payload, PRIVACY_SETTINGS_OFFSET + PRIVACY_BASIC_KEYS_OFFSET, "1234");
  writeHex(payload, PRIVACY_SETTINGS_OFFSET + PRIVACY_BASIC_KEYS_OFFSET + 2, "abcd");

  writeBitField(payload, FREQUENCY_RANGE_BIT_OFFSET, 8, 2);
  writeBcdTimestamp(payload, LAST_PROGRAMMED_TIME_OFFSET, "20240609123045");
  writeDecimalNibbles(payload, CPS_VERSION_OFFSET, "1012");

  const contactBase = CONTACTS_OFFSET;
  writeLittleInt(payload, contactBase + CONTACT_CALL_ID_OFFSET, 3, 9);
  writeUcs2(payload, contactBase + CONTACT_NAME_OFFSET, 32, "TG9 Local");

  const channelBase = CHANNELS_OFFSET;
  writeLittleInt(payload, channelBase + CHANNEL_CONTACT_INDEX_OFFSET, 2, 1);
  writeFrequencyMHz(payload, channelBase + CHANNEL_RX_FREQ_OFFSET, 438.50000);
  writeFrequencyMHz(payload, channelBase + CHANNEL_TX_FREQ_OFFSET, 430.90000);
  writeBitField(payload, channelBase * 8 + CHANNEL_MODE_BIT_OFFSET, 2, 2);
  writeBitField(payload, channelBase * 8 + CHANNEL_BANDWIDTH_BIT_OFFSET, 2, 0);
  writeBitField(payload, channelBase * 8 + CHANNEL_COLOR_CODE_BIT_OFFSET, 4, 1);
  writeBitField(payload, channelBase * 8 + CHANNEL_SLOT_BIT_OFFSET, 2, 2);
  writeBitField(payload, channelBase * 8 + CHANNEL_POWER_BIT_OFFSET, 1, 1);
  payload[channelBase + 5] = 32;
  writeUcs2(payload, channelBase + CHANNEL_NAME_OFFSET, 32, "Local Repeater");

  const zoneBase = ZONES_OFFSET;
  writeUcs2(payload, zoneBase + ZONE_NAME_OFFSET, 32, "Home");
  writeLittleInt(payload, zoneBase + ZONE_CHANNELS_OFFSET, 2, 1);

  return payload;
}

function buildRdtFixtureFromPayload(payload: Uint8Array): Uint8Array {
  const rdt = new Uint8Array(RDT_SIZE);
  rdt.fill(0x5a, 0, RDT_HEADER_SIZE);
  rdt.set(new TextEncoder().encode("DfuSe"), 0);
  rdt.set(payload, RDT_HEADER_SIZE);
  rdt.fill(0xa5, RDT_HEADER_SIZE + PAYLOAD_SIZE);
  return rdt;
}

describe("parseCodeplug", () => {
  it("parses core records from payload bytes", () => {
    const payload = buildPayloadFixture();
    const doc = parseCodeplug("fixture.bin", payload);

    expect(doc.format).toBe("bin");
    expect(doc.variant).toBe("D");
    expect(doc.model).toBe("MD380");
    expect(doc.settings.radioName).toBe("TEST-RADIO");
    expect(doc.settings.radioId).toBe(1234567);
    expect(doc.basicInfo.cpsVersion).toBe("1012");
    expect(doc.basicInfo.frequencyRange).toBe("400-480");
    expect(doc.basicInfo.lastProgrammedTime).toBe("2024-06-09 12:30:45");

    expect(doc.settings.voxSensitivity).toBe(7);
    expect(doc.settings.txPreambleDurationMs).toBe(600);
    expect(doc.settings.rxLowBatteryIntervalSec).toBe(30);
    expect(doc.settings.backlightTimeoutSec).toBe("10");
    expect(doc.settings.keypadAutoLockSec).toBe("10");
    expect(doc.settings.bootUpMessageLine1).toBe("HELLO");
    expect(doc.settings.bootUpMessageLine2).toBe("WORLD");
    expect(doc.settings.alertTones).toBe("On");
    expect(doc.settings.timeZone).toBe("UTC+8:00");

    expect(doc.menuSettings.hangTime).toBe("12");
    expect(doc.menuSettings.radioDisable).toBe("On");
    expect(doc.menuSettings.scan).toBe("Off");
    expect(doc.menuSettings.passwordAndLock).toBe("On");

    expect(doc.radioButtons).toHaveLength(4);
    expect(doc.radioButtons[0].actionCode).toBe(14);
    expect(doc.longPressDurationMs).toBe(1250);

    expect(doc.textMessages).toHaveLength(2);
    expect(doc.textMessages[0].text).toBe("Test message A");
    expect(doc.textMessages[1].text).toBe("Test message B");

    expect(doc.privacySettings.enhancedKeys[0]).toBe("ffeeddccbbaa99887766554433221100");
    expect(doc.privacySettings.enhancedKeys[1]).toBe("00112233445566778899aabbccddeeff");
    expect(doc.privacySettings.basicKeys[0]).toBe("3412");
    expect(doc.privacySettings.basicKeys[1]).toBe("cdab");

    expect(doc.contacts).toHaveLength(1);
    expect(doc.contacts[0].name).toBe("TG9 Local");
    expect(doc.contacts[0].callId).toBe(9);

    expect(doc.channels).toHaveLength(1);
    expect(doc.channels[0].name).toBe("Local Repeater");
    expect(doc.channels[0].contactId).toBe(1);
    expect(doc.channels[0].channelMode).toBe("Digital");
    expect(doc.channels[0].repeaterSlot).toBe(2);
    expect(doc.channels[0].power).toBe("High");

    expect(doc.zones).toHaveLength(1);
    expect(doc.zones[0].name).toBe("Home");
    expect(doc.zones[0].channelIds).toEqual([1]);
  });

  it("uses RDT payload offset and preserves wrapper bytes through serialize", () => {
    const payload = buildPayloadFixture();
    const rdt = buildRdtFixtureFromPayload(payload);

    const doc = parseCodeplug("fixture.rdt", rdt);
    expect(doc.payloadOffset).toBe(RDT_HEADER_SIZE);
    expect(doc.payloadLength).toBe(PAYLOAD_SIZE);

    doc.settings.radioName = "RDT-EDIT";
    const out = serializeCodeplug(doc, rdt);

    expect(out.slice(0, RDT_HEADER_SIZE)).toEqual(rdt.slice(0, RDT_HEADER_SIZE));
    expect(out.slice(RDT_HEADER_SIZE + PAYLOAD_SIZE)).toEqual(rdt.slice(RDT_HEADER_SIZE + PAYLOAD_SIZE));

    const reparsed = parseCodeplug("fixture.rdt", out);
    expect(reparsed.settings.radioName).toBe("RDT-EDIT");
  });

  it("parses text messages from alternate offset when primary region is empty", () => {
    const payload = buildPayloadFixture();
    payload.fill(0, TEXT_MESSAGES_OFFSET, TEXT_MESSAGES_OFFSET + TEXT_MESSAGE_RECORD_SIZE * 2);
    writeUcs2(payload, TEXT_MESSAGES_OFFSET_ALT, TEXT_MESSAGE_RECORD_SIZE, "Alt message A");
    writeUcs2(payload, TEXT_MESSAGES_OFFSET_ALT + TEXT_MESSAGE_RECORD_SIZE, TEXT_MESSAGE_RECORD_SIZE, "Alt message B");

    const doc = parseCodeplug("fixture.bin", payload);

    expect(doc.textMessages).toHaveLength(2);
    expect(doc.textMessages[0].text).toBe("Alt message A");
    expect(doc.textMessages[1].text).toBe("Alt message B");
  });

  it("detects S variant from model metadata", () => {
    const payload = buildPayloadFixture("MD390");
    const doc = parseCodeplug("fixture.bin", payload);

    expect(doc.model).toBe("MD390");
    expect(doc.variant).toBe("S");
  });

  it("rejects unsupported dfu import", () => {
    const payload = buildPayloadFixture();
    expect(() => parseCodeplug("fixture.dfu", payload)).toThrow(/not supported/i);
  });

  it("rejects invalid rdt header", () => {
    const payload = buildPayloadFixture();
    const rdt = buildRdtFixtureFromPayload(payload);
    rdt[0] = 0x00;
    expect(() => parseCodeplug("fixture.rdt", rdt)).toThrow(/header/i);
  });

  it("rejects unsupported bin size", () => {
    expect(() => parseCodeplug("fixture.bin", new Uint8Array(1234))).toThrow(/Unsupported \.bin size/i);
  });
});

describe("serializeCodeplug", () => {
  it("keeps .bin data semantically identical for no-edit export", () => {
    const payload = buildPayloadFixture();
    const doc = parseCodeplug("fixture.bin", payload);
    const out = serializeCodeplug(doc, payload);
    const reparsed = parseCodeplug("fixture.bin", out);
    expect(reparsed.settings.radioName).toBe(doc.settings.radioName);
    expect(reparsed.channels[0].name).toBe(doc.channels[0].name);
    expect(reparsed.channels[0].rxFrequencyMHz).toBeCloseTo(doc.channels[0].rxFrequencyMHz, 5);
    expect(reparsed.channels[0].txFrequencyMHz).toBeCloseTo(doc.channels[0].txFrequencyMHz, 5);
  });

  it("keeps .rdt data semantically identical for no-edit export", () => {
    const payload = buildPayloadFixture();
    const rdt = buildRdtFixtureFromPayload(payload);
    const doc = parseCodeplug("fixture.rdt", rdt);
    const out = serializeCodeplug(doc, rdt);
    const reparsed = parseCodeplug("fixture.rdt", out);
    expect(reparsed.payloadOffset).toBe(RDT_HEADER_SIZE);
    expect(reparsed.channels[0].name).toBe(doc.channels[0].name);
    expect(reparsed.settings.radioId).toBe(doc.settings.radioId);
  });

  it("persists settings and RF edits after reparse", () => {
    const payload = buildPayloadFixture();
    const doc = parseCodeplug("fixture.bin", payload);

    doc.settings.radioName = "NEW-NAME";
    doc.settings.radioId = 7654321;
    doc.settings.voxSensitivity = 9;
    doc.settings.txPreambleDurationMs = 1200;
    doc.settings.rxLowBatteryIntervalSec = 40;
    doc.settings.backlightTimeoutSec = "15";
    doc.settings.keypadAutoLockSec = "Manual";
    doc.settings.bootUpMessageLine1 = "LINE-ONE";
    doc.settings.bootUpMessageLine2 = "LINE-TWO";
    doc.settings.alertTones = "Off";
    doc.settings.timeZone = "UTC+3:00";
    doc.menuSettings.hangTime = "Hang";
    doc.menuSettings.scan = "On";
    doc.radioButtons[0].actionCode = 22;
    doc.longPressDurationMs = 3000;
    doc.textMessages[0].text = "Edited Message";
    doc.privacySettings.enhancedKeys[0] = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    doc.privacySettings.basicKeys[0] = "0f0f";
    doc.basicInfo.cpsVersion = "2025";
    doc.channels[0].rxFrequencyMHz = 439.01234;
    doc.channels[0].txFrequencyMHz = 431.01234;
    doc.channels[0].channelMode = "Analog";
    doc.channels[0].colorCode = 7;
    doc.channels[0].repeaterSlot = 1;
    doc.channels[0].bandwidthKhz = "25";
    doc.channels[0].power = "Low";

    const out = serializeCodeplug(doc, payload);
    const reparsed = parseCodeplug("fixture.bin", out);

    expect(reparsed.settings.radioName).toBe("NEW-NAME");
    expect(reparsed.settings.radioId).toBe(7654321);
    expect(reparsed.settings.voxSensitivity).toBe(9);
    expect(reparsed.settings.txPreambleDurationMs).toBe(1200);
    expect(reparsed.settings.rxLowBatteryIntervalSec).toBe(40);
    expect(reparsed.settings.backlightTimeoutSec).toBe("15");
    expect(reparsed.settings.keypadAutoLockSec).toBe("Manual");
    expect(reparsed.settings.bootUpMessageLine1).toBe("LINE-ONE");
    expect(reparsed.settings.bootUpMessageLine2).toBe("LINE-TWO");
    expect(reparsed.settings.alertTones).toBe("Off");
    expect(reparsed.settings.timeZone).toBe("UTC+3:00");
    expect(reparsed.menuSettings.hangTime).toBe("Hang");
    expect(reparsed.menuSettings.scan).toBe("On");
    expect(reparsed.radioButtons[0].actionCode).toBe(22);
    expect(reparsed.longPressDurationMs).toBe(3000);
    expect(reparsed.textMessages[0].text).toBe("Edited Message");
    expect(reparsed.privacySettings.enhancedKeys[0]).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(reparsed.privacySettings.basicKeys[0]).toBe("0f0f");
    expect(reparsed.basicInfo.cpsVersion).toBe("2025");
    expect(reparsed.channels[0].rxFrequencyMHz).toBeCloseTo(439.01234, 5);
    expect(reparsed.channels[0].txFrequencyMHz).toBeCloseTo(431.01234, 5);
    expect(reparsed.channels[0].channelMode).toBe("Analog");
    expect(reparsed.channels[0].colorCode).toBe(7);
    expect(reparsed.channels[0].repeaterSlot).toBe(1);
    expect(reparsed.channels[0].bandwidthKhz).toBe("25");
    expect(reparsed.channels[0].power).toBe("Low");
  });

  it("writes newly added contact/channel/zone and links references", () => {
    const payload = buildPayloadFixture();
    const doc = parseCodeplug("fixture.bin", payload);

    doc.contacts.push({ id: 2, name: "Parrot", callId: 9990 });
    doc.channels.push({
      id: 2,
      name: "Simplex",
      contactId: 2,
      rxFrequencyMHz: 433.55,
      txFrequencyMHz: 433.55,
      txOffsetMHz: 0,
      channelMode: "Digital",
      admitCriteria: "Always",
      inCallCriteria: "Always",
      rxOnly: "Off",
      autoscan: "Off",
      loneWorker: "Off",
      vox: "Off",
      allowTalkaround: "Off",
      talkaround: "Off",
      privateCallConfirmed: "Off",
      dataCallConfirmed: "Off",
      emergencyAlarmAck: "Off",
      compressedUdpDataHeader: "On",
      displayPttId: "Off",
      privacy: "None",
      privacyNumber: 1,
      emergencySystem: 0,
      totSec: 60,
      totRekeyDelaySec: 0,
      rxRefFrequency: "Low",
      txRefFrequency: "Low",
      rxSignallingSystem: "Off",
      txSignallingSystem: "Off",
      ctcssDecode: "None",
      ctcssEncode: "None",
      qtReverse: "180",
      reverseBurst: "On",
      decode1: "Off",
      decode2: "Off",
      decode3: "Off",
      decode4: "Off",
      decode5: "Off",
      decode6: "Off",
      decode7: "Off",
      decode8: "Off",
      dcdmSwitch: "Off",
      leaderMs: "Off",
      allowInterrupt: "Off",
      nonQtDqtTurnoffFreq: "None",
      receiveGpsInfo: "Off",
      sendGpsInfo: "Off",
      colorCode: 1,
      repeaterSlot: 1,
      bandwidthKhz: "12.5",
      power: "High",
    });
    doc.zones.push({ id: 2, name: "Travel", channelIds: [2] });

    const out = serializeCodeplug(doc, payload);
    const reparsed = parseCodeplug("fixture.bin", out);

    expect(reparsed.contacts.some((contact) => contact.name === "Parrot" && contact.callId === 9990)).toBe(true);
    expect(reparsed.channels.some((channel) => channel.name === "Simplex" && channel.contactId === 2)).toBe(true);
    const travel = reparsed.zones.find((zone) => zone.name === "Travel");
    expect(travel).toBeTruthy();
    expect(travel?.channelIds).toContain(2);
  });

  it("round-trips S-variant payload edits", () => {
    const payload = buildPayloadFixture("MD390");
    const doc = parseCodeplug("fixture.bin", payload);

    doc.settings.radioName = "S-VARIANT";
    doc.channels[0].channelMode = "Digital";
    doc.channels[0].colorCode = 9;
    doc.channels[0].repeaterSlot = 2;

    const out = serializeCodeplug(doc, payload);
    const reparsed = parseCodeplug("fixture.bin", out);

    expect(reparsed.variant).toBe("S");
    expect(reparsed.settings.radioName).toBe("S-VARIANT");
    expect(reparsed.channels[0].channelMode).toBe("Digital");
    expect(reparsed.channels[0].colorCode).toBe(9);
    expect(reparsed.channels[0].repeaterSlot).toBe(2);
  });
});
