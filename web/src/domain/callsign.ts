export type CallsignProfile = "global" | "eu";
export type CallsignFormat = "linear" | "indexed";

const MAGIC = 0x300a01;
const HEADER_SIZE = 9;
const INDEX_SIZE = 6;
const NAME_FLAG = 1 << 7;
const NICKNAME_FLAG = 1 << 6;
const CITY_FLAG = 1 << 5;
const STATE_FLAG = 1 << 4;
const COUNTRY_FLAG = 1 << 3;
const SHORT_CALLSIGN = 7;

function toAsciiSafe(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === '"') {
      if (inQuotes && index + 1 < line.length && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current);
  return cells;
}

function encodeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function writeCsvLine(values: string[]): string {
  return `${values.map(encodeCsvCell).join(",")}\n`;
}

export function normalizeCallsignCsv(rawText: string, profile: CallsignProfile): Uint8Array {
  const rows: string[][] = [];
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const rawRow = parseCsvLine(line);
    if (rawRow.length === 0) {
      continue;
    }

    const row = rawRow.map((value) => toAsciiSafe(value.trim()));
    if (!/^\d+$/.test(row[0] ?? "")) {
      continue;
    }

    const normalized = [...row, "", "", "", "", "", "", ""].slice(0, 7);
    if (profile === "eu") {
      normalized[2] = "";
      normalized[3] = "";
      normalized[4] = "";
      normalized[5] = "";
    }

    rows.push(normalized);
  }

  rows.sort((left, right) => {
    const idDiff = Number.parseInt(left[0], 10) - Number.parseInt(right[0], 10);
    if (idDiff !== 0) {
      return idDiff;
    }
    return left[1].localeCompare(right[1]);
  });

  let output = "";
  for (const row of rows) {
    output += writeCsvLine(row);
  }

  return new TextEncoder().encode(output);
}

export function buildLinearCallsignDb(csvBytes: Uint8Array): Uint8Array {
  const header = new TextEncoder().encode(`${csvBytes.byteLength}\n`);
  const out = new Uint8Array(header.byteLength + csvBytes.byteLength);
  out.set(header, 0);
  out.set(csvBytes, header.byteLength);
  return out;
}

class IndexedDbBuilder {
  private readonly buffer = new Uint8Array(15 * 1024 * 1024);
  private offset = HEADER_SIZE;
  private nodePoolOffset: number;
  private endOffset: number;
  private readonly stringDict = new Map<string, number>();
  private readonly callsignDict = new Map<string, number>();
  private readonly cityDict = new Map<string, number>();
  private readonly stateDict = new Map<string, number>();
  private readonly encoder = new TextEncoder();

  constructor(private readonly userCount: number) {
    this.nodePoolOffset = HEADER_SIZE + userCount * INDEX_SIZE;
    this.endOffset = this.nodePoolOffset;
  }

  private put3(value: number): void {
    this.buffer[this.offset] = (value >> 16) & 0xff;
    this.buffer[this.offset + 1] = (value >> 8) & 0xff;
    this.buffer[this.offset + 2] = value & 0xff;
    this.offset += 3;
  }

  private appendOffset(value: number): void {
    this.buffer[this.endOffset] = (value >> 16) & 0xff;
    this.buffer[this.endOffset + 1] = (value >> 8) & 0xff;
    this.buffer[this.endOffset + 2] = value & 0xff;
    this.endOffset += 3;
  }

  private append2ByteOffset(value: number): void {
    this.buffer[this.endOffset] = (value >> 8) & 0xff;
    this.buffer[this.endOffset + 1] = value & 0xff;
    this.endOffset += 2;
  }

  private appendStringWithFlag(value: string, flag: number): void {
    const bytes = this.encoder.encode(value);
    this.buffer[this.endOffset] = flag | bytes.byteLength;
    this.endOffset += 1;
    this.buffer.set(bytes, this.endOffset);
    this.endOffset += bytes.byteLength;
  }

  private appendString(value: string): void {
    this.appendStringWithFlag(value, 0);
  }

  private appendStringNode(value: string): number {
    const existing = this.stringDict.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const offset = this.endOffset;
    this.stringDict.set(value, offset);
    this.appendString(value);
    return offset;
  }

  private appendNameNode(value: string): number {
    return this.appendStringNode(value);
  }

  private appendNicknameNode(value: string): number {
    return this.appendStringNode(value);
  }

  appendCountryNode(country: string): number {
    return this.appendStringNode(country) - this.nodePoolOffset;
  }

  private appendStateNode(state: string, country: string): number {
    const key = `${state},${country}`;
    const existing = this.stateDict.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const offset = this.endOffset;
    this.stateDict.set(key, offset);
    if (country.length > 0) {
      const countryOffset = this.appendCountryNode(country);
      this.appendString(state);
      this.append2ByteOffset(countryOffset);
    } else {
      this.appendString(state);
    }
    return offset;
  }

  private appendCityNode(city: string, state: string, country: string): number {
    const key = `${city},${state},${country}`;
    const existing = this.cityDict.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const offset = this.endOffset;
    this.cityDict.set(key, offset);
    this.appendString(city);
    if (state.length > 0) {
      const stateOffset = this.appendStateNode(state, country);
      this.appendOffset(stateOffset);
    } else if (country.length > 0) {
      const countryOffset = this.appendCountryNode(country);
      this.append2ByteOffset(countryOffset);
    }
    return offset;
  }

  private appendCallsignNode(callsign: string, name: string, nickname: string, city: string, state: string, country: string): number {
    const key = `${callsign},${name},${nickname},${city},${state},${country}`;
    const existing = this.callsignDict.get(key);
    if (existing !== undefined) {
      return existing;
    }

    let flag = 0;
    let nameOffset = 0;
    let nicknameOffset = 0;
    let cityOffset = 0;
    let stateOffset = 0;
    let countryOffset = 0;

    if (name.length > 0) {
      flag |= NAME_FLAG;
      nameOffset = this.appendNameNode(name);
    }
    if (nickname.length > 0) {
      flag |= NICKNAME_FLAG;
      nicknameOffset = this.appendNicknameNode(nickname);
    }
    if (city.length > 0) {
      flag |= CITY_FLAG;
      cityOffset = this.appendCityNode(city, state, country);
    }
    if (state.length > 0) {
      flag |= STATE_FLAG;
      stateOffset = this.appendStateNode(state, country);
    }
    if (country.length > 0) {
      flag |= COUNTRY_FLAG;
      countryOffset = this.appendCountryNode(country);
    }

    const offset = this.endOffset;
    this.callsignDict.set(key, offset);

    if (callsign.length === 0 || callsign.length > SHORT_CALLSIGN) {
      this.buffer[this.endOffset] = flag;
      this.endOffset += 1;
      flag = 0;
    }

    this.appendStringWithFlag(callsign, flag);
    if (name.length > 0) {
      this.appendOffset(nameOffset);
    }
    if (nickname.length > 0) {
      this.appendOffset(nicknameOffset);
    }
    if (city.length > 0) {
      this.appendOffset(cityOffset);
    } else if (state.length > 0) {
      this.appendOffset(stateOffset);
    } else if (country.length > 0) {
      this.append2ByteOffset(countryOffset);
    }

    return offset;
  }

  addUser(id: number, callsign: string, name: string, nickname: string, city: string, state: string, country: string): void {
    this.put3(id);
    this.put3(this.appendCallsignNode(callsign, name, nickname, city, state, country));
  }

  finish(): Uint8Array {
    const savedOffset = this.offset;
    this.offset = 0;
    this.put3(MAGIC);
    this.put3(this.userCount);
    this.put3(this.endOffset);
    this.offset = savedOffset;
    return this.buffer.slice(0, this.endOffset);
  }
}

export function buildIndexedCallsignDb(csvBytes: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(csvBytes);
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => parseCsvLine(line));

  const users = rows
    .filter((row) => row.length >= 7 && /^\d+$/.test(row[0] ?? ""))
    .map((row) => ({
      id: Number.parseInt(row[0], 10),
      callsign: row[1] ?? "",
      name: row[2] ?? "",
      city: row[3] ?? "",
      state: row[4] ?? "",
      nickname: row[5] ?? "",
      country: row[6] ?? "",
    }))
    .sort((left, right) => left.id - right.id);

  const builder = new IndexedDbBuilder(users.length);

  for (const user of users) {
    if (user.country.length > 0) {
      builder.appendCountryNode(user.country);
    }
  }

  for (const user of users) {
    builder.addUser(user.id, user.callsign, user.name, user.nickname, user.city, user.state, user.country);
  }

  return builder.finish();
}

export function buildCallsignDatabase(rawText: string, format: CallsignFormat, profile: CallsignProfile): {
  normalizedCsv: Uint8Array;
  payload: Uint8Array;
} {
  const normalizedCsv = normalizeCallsignCsv(rawText, profile);
  if (format === "linear") {
    return { normalizedCsv, payload: buildLinearCallsignDb(normalizedCsv) };
  }
  return { normalizedCsv, payload: buildIndexedCallsignDb(normalizedCsv) };
}
