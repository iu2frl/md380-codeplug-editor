import { describe, expect, it } from "vitest";

import { buildCallsignDatabase, buildIndexedCallsignDb, buildLinearCallsignDb, normalizeCallsignCsv } from "./callsign";

describe("callsign domain", () => {
  it("normalizes and sorts CSV rows with profile support", () => {
    const source = [
      "id,callsign,name,city,state,nickname,country",
      "2,IZ2BBB,Luigi,Roma,RM,Gigi,Italy",
      "1,IK1AAA,Andre\u0301,Torino,TO,,Italy",
    ].join("\n");

    const global = new TextDecoder().decode(normalizeCallsignCsv(source, "global"));
    expect(global).toContain("1,IK1AAA,Andre,Torino,TO,,Italy");
    expect(global.split("\n")[0]).toBe("1,IK1AAA,Andre,Torino,TO,,Italy");

    const eu = new TextDecoder().decode(normalizeCallsignCsv(source, "eu"));
    expect(eu).toContain("1,IK1AAA,,,,,Italy");
  });

  it("builds linear database with size prefix", () => {
    const csv = new TextEncoder().encode("1,IK1AAA,Name,City,State,Nick,Country\n");
    const payload = buildLinearCallsignDb(csv);
    const asText = new TextDecoder().decode(payload);
    expect(asText.startsWith("38\n1,IK1AAA,Name,City,State,Nick,Country\n")).toBe(true);
  });

  it("builds indexed database header and non-empty body", () => {
    const csv = new TextEncoder().encode(["1,IK1AAA,Name,City,State,Nick,Country", "2,IK2BBB,User,Milan,MI,,Italy"].join("\n") + "\n");
    const indexed = buildIndexedCallsignDb(csv);
    expect(indexed.byteLength).toBeGreaterThan(9);
    expect(Array.from(indexed.slice(0, 3))).toEqual([0x30, 0x0a, 0x01]);
  });

  it("buildCallsignDatabase returns normalized csv and payload", () => {
    const source = "1,IK1AAA,Name,City,State,Nick,Country\n";
    const built = buildCallsignDatabase(source, "indexed", "global");
    expect(built.normalizedCsv.byteLength).toBeGreaterThan(0);
    expect(built.payload.byteLength).toBeGreaterThan(0);
  });
});
