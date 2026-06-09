import { describe, expect, it } from "vitest";

import { parseCodeplug, serializeCodeplug } from "./parser";

const PAYLOAD_SIZE = 262144;
const RDT_HEADER_SIZE = 549;
const RDT_SIZE = 262709;

const GENERAL_SETTINGS_OFFSET = 8256;
const RADIO_ID_OFFSET = 68;
const RADIO_NAME_OFFSET = 112;

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
  writeUcs2(payload, channelBase + CHANNEL_NAME_OFFSET, 32, "Local Repeater");

  const zoneBase = ZONES_OFFSET;
  writeUcs2(payload, zoneBase + ZONE_NAME_OFFSET, 32, "Home");
  writeLittleInt(payload, zoneBase + ZONE_CHANNELS_OFFSET, 2, 1);

  return payload;
}

function buildRdtFixtureFromPayload(payload: Uint8Array): Uint8Array {
  const rdt = new Uint8Array(RDT_SIZE);
  rdt.fill(0x5a, 0, RDT_HEADER_SIZE);
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

  it("detects S variant from model metadata", () => {
    const payload = buildPayloadFixture("MD390");
    const doc = parseCodeplug("fixture.bin", payload);

    expect(doc.model).toBe("MD390");
    expect(doc.variant).toBe("S");
  });
});

describe("serializeCodeplug", () => {
  it("persists settings and RF edits after reparse", () => {
    const payload = buildPayloadFixture();
    const doc = parseCodeplug("fixture.bin", payload);

    doc.settings.radioName = "NEW-NAME";
    doc.settings.radioId = 7654321;
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
      channelMode: "Digital",
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
