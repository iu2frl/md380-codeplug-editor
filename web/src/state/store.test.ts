import { describe, expect, it } from "vitest";

import { EditorStore } from "./store";

describe("EditorStore.applyRadioDeviceInfo", () => {
  it("populates basic info fields from radio device metadata", () => {
    const store = new EditorStore();
    store.createBlank("MD380", "bin");

    store.applyRadioDeviceInfo({
      manufacturerName: "AnyRoad Technology",
      productName: "DR780",
      serialNumber: "STM32SERIAL",
      uniqueDeviceId: "0102030405060708090A0B0C",
      mcuVersion: "STM32F405/407/415/417 (rev 0x1001)",
    });

    const document = store.getState().document;
    expect(document?.basicInfo.maker).toBe("AnyRoad Technology");
    expect(document?.basicInfo.mcuVersion).toBe("STM32F405/407/415/417 (rev 0x1001)");
    expect(document?.basicInfo.uniqueDeviceId).toBe("0102030405060708090A0B0C");
  });

  it("falls back to the USB serial number when no unique device ID is available", () => {
    const store = new EditorStore();
    store.createBlank("MD380", "bin");

    store.applyRadioDeviceInfo({ serialNumber: "FALLBACK123" });

    expect(store.getState().document?.basicInfo.uniqueDeviceId).toBe("FALLBACK123");
  });

  it("does not mark the document dirty when applying radio metadata", () => {
    const store = new EditorStore();
    store.createBlank("MD380", "bin");

    store.applyRadioDeviceInfo({
      manufacturerName: "AnyRoad Technology",
      mcuVersion: "STM32F405/407/415/417 (rev 0x1001)",
    });

    expect(store.getState().isDirty).toBe(false);
  });

  it("ignores empty device info and leaves existing values untouched", () => {
    const store = new EditorStore();
    store.createBlank("MD380", "bin");
    const before = store.getState().document?.basicInfo.mcuVersion;

    store.applyRadioDeviceInfo({});

    expect(store.getState().document?.basicInfo.mcuVersion).toBe(before);
    expect(store.getState().document?.basicInfo.maker).toBeUndefined();
  });
});
