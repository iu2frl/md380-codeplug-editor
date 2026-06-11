import { describe, expect, it } from "vitest";

import { createBrowserRadioTransport, detectBrowserRadioCapabilities } from "./browserRadio";

function withMockUsb<T>(usbImpl: unknown, fn: () => Promise<T> | T): Promise<T> | T {
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "Mozilla/5.0 Chrome/126.0.0.0", usb: usbImpl },
    configurable: true,
    writable: true,
  });

  const restore = (): void => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

describe("detectBrowserRadioCapabilities", () => {
  it("reports blockers when not secure and WebUSB is absent", () => {
    const caps = detectBrowserRadioCapabilities(undefined, false);
    expect(caps.supported).toBe(false);
    expect(caps.blockers.length).toBeGreaterThan(0);
  });

  it("reports supported when requestDevice is available in secure context", () => {
    const fakeNav = {
      userAgent: "Mozilla/5.0 Chrome/126.0.0.0",
      usb: {
        requestDevice: () => Promise.resolve(undefined),
      },
    } as unknown as Navigator;

    const caps = detectBrowserRadioCapabilities(fakeNav, true);
    expect(caps.supported).toBe(true);
    expect(caps.blockers).toHaveLength(0);
  });

  it("creates transport only when capabilities are supported", () => {
    const unsupported = detectBrowserRadioCapabilities(undefined, false);
    expect(createBrowserRadioTransport(unsupported)).toBeNull();

    const supported = detectBrowserRadioCapabilities(
      {
        userAgent: "Mozilla/5.0 Chrome/126.0.0.0",
        usb: { requestDevice: () => Promise.resolve(undefined) },
      } as unknown as Navigator,
      true,
    );

    expect(
      createBrowserRadioTransport(
        supported,
        {
          userAgent: "Mozilla/5.0 Chrome/126.0.0.0",
          usb: { requestDevice: () => Promise.resolve(undefined) },
        } as unknown as Navigator,
      ),
    ).not.toBeNull();
  });

  it("connects and claims a DFU interface", async () => {
    const calls: string[] = [];
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      productName: "STM32 BOOTLOADER",
      manufacturerName: "STMicroelectronics",
      serialNumber: "ABC123",
      opened: false,
      configuration: null,
      open: async () => {
        calls.push("open");
        fakeDevice.opened = true;
      },
      selectConfiguration: async (value: number) => {
        calls.push(`selectConfiguration:${value}`);
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [
            {
              interfaceNumber: 2,
              alternates: [
                {
                  alternateSetting: 1,
                  interfaceClass: 0xfe,
                  interfaceSubclass: 0x01,
                  interfaceProtocol: 0x02,
                },
              ],
            },
          ],
        };
      },
      selectAlternateInterface: async (interfaceNumber: number, alternateSetting: number) => {
        calls.push(`selectAlternate:${interfaceNumber}:${alternateSetting}`);
      },
      claimInterface: async (interfaceNumber: number) => {
        calls.push(`claimInterface:${interfaceNumber}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => {
          calls.push("requestDevice");
          return fakeDevice;
        },
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();
        expect(transport!.isConnected()).toBe(false);
        expect(transport!.getConnectedDevice()).toBeNull();

        const connected = await transport!.connect();
        expect(connected.vendorId).toBe(0x0483);
        expect(connected.productId).toBe(0xdf11);
        expect(connected.interfaceNumber).toBe(2);
        expect(transport!.isConnected()).toBe(true);
        expect(transport!.getConnectedDevice()?.vendorId).toBe(0x0483);
        expect(calls).toEqual([
          "requestDevice",
          "open",
          "selectConfiguration:1",
          "claimInterface:2",
          "selectAlternate:2:1",
        ]);
      },
    );
  });

  it("surfaces user cancellation with friendly message", async () => {
    await withMockUsb(
      {
        requestDevice: async () => {
          const error = new Error("cancelled");
          error.name = "NotFoundError";
          throw error;
        },
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        await expect(transport!.connect()).rejects.toThrow("No USB device was selected");
      },
    );
  });

  it("disconnect releases claimed interface and closes USB device", async () => {
    const calls: string[] = [];
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      opened: false,
      configuration: null,
      open: async () => {
        calls.push("open");
        fakeDevice.opened = true;
      },
      close: async () => {
        calls.push("close");
        fakeDevice.opened = false;
      },
      selectConfiguration: async (value: number) => {
        calls.push(`selectConfiguration:${value}`);
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [
            {
              interfaceNumber: 1,
              alternates: [{ alternateSetting: 0 }],
            },
          ],
        };
      },
      claimInterface: async (interfaceNumber: number) => {
        calls.push(`claimInterface:${interfaceNumber}`);
      },
      releaseInterface: async (interfaceNumber: number) => {
        calls.push(`releaseInterface:${interfaceNumber}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => {
          calls.push("requestDevice");
          return fakeDevice;
        },
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();

        await transport!.connect();
        expect(transport!.isConnected()).toBe(true);
        await transport!.disconnect();
        expect(transport!.isConnected()).toBe(false);
        expect(transport!.getConnectedDevice()).toBeNull();

        expect(calls).toEqual([
          "requestDevice",
          "open",
          "selectConfiguration:1",
          "claimInterface:1",
          "releaseInterface:1",
          "close",
        ]);
      },
    );
  });

  it("reads full codeplug over DFU upload blocks", async () => {
    const seenUploadBlocks: number[] = [];
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      opened: false,
      configuration: null,
      open: async () => {
        fakeDevice.opened = true;
      },
      close: async () => {
        fakeDevice.opened = false;
      },
      selectConfiguration: async (value: number) => {
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [{ interfaceNumber: 1, alternates: [{ alternateSetting: 0 }] }],
        };
      },
      claimInterface: async () => Promise.resolve(),
      releaseInterface: async () => Promise.resolve(),
      controlTransferOut: async () => ({ status: "ok" as const }),
      controlTransferIn: async (setup: { request: number; value: number }, length: number) => {
        if (setup.request === 5) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(2).buffer) };
        }
        if (setup.request === 3) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(0, 0, 0, 0, 5, 0).buffer) };
        }
        if (setup.request === 2) {
          seenUploadBlocks.push(setup.value);
          const block = new Uint8Array(length);
          block.fill(setup.value & 0xff);
          return { status: "ok" as const, data: new DataView(block.buffer) };
        }
        throw new Error(`unexpected controlTransferIn request ${setup.request}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => fakeDevice,
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();
        await transport!.connect();

        const bytes = await transport!.readCodeplug();
        expect(bytes.byteLength).toBe(262144);
        expect(bytes[0]).toBe(2);
        expect(bytes[bytes.byteLength - 1]).toBe(0x01);
        expect(seenUploadBlocks[0]).toBe(2);
        expect(seenUploadBlocks[seenUploadBlocks.length - 1]).toBe(257);
        expect(seenUploadBlocks.length).toBe(256);
      },
    );
  });

  it("writes full codeplug over DFU download blocks", async () => {
    const downloadBlocks: Array<{ value: number; size: number }> = [];
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      opened: false,
      configuration: null,
      open: async () => {
        fakeDevice.opened = true;
      },
      close: async () => {
        fakeDevice.opened = false;
      },
      selectConfiguration: async (value: number) => {
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [{ interfaceNumber: 1, alternates: [{ alternateSetting: 0 }] }],
        };
      },
      claimInterface: async () => Promise.resolve(),
      releaseInterface: async () => Promise.resolve(),
      controlTransferOut: async (setup: { request: number; value: number }, data?: BufferSource) => {
        if (setup.request === 1) {
          const size = data instanceof Uint8Array ? data.byteLength : 0;
          downloadBlocks.push({ value: setup.value, size });
        }
        return { status: "ok" as const };
      },
      controlTransferIn: async (setup: { request: number }, _length: number) => {
        if (setup.request === 5) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(2).buffer) };
        }
        if (setup.request === 3) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(0, 0, 0, 0, 5, 0).buffer) };
        }
        if (setup.request === 2) {
          return { status: "ok" as const, data: new DataView(new Uint8Array(32).buffer) };
        }
        throw new Error(`unexpected controlTransferIn request ${setup.request}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => fakeDevice,
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();
        await transport!.connect();

        const bytes = new Uint8Array(262144);
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = index & 0xff;
        }

        await transport!.writeCodeplug(bytes);

        const dataBlocks = downloadBlocks.filter((item) => item.value >= 2);
        expect(dataBlocks.length).toBe(256);
        expect(dataBlocks[0]).toEqual({ value: 2, size: 1024 });
        expect(dataBlocks[dataBlocks.length - 1]).toEqual({ value: 257, size: 1024 });
      },
    );
  });

  it("syncs RTC clock with BCD-encoded payload", async () => {
    const downloads: Array<{ value: number; bytes: number[] }> = [];
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      opened: false,
      configuration: null,
      open: async () => {
        fakeDevice.opened = true;
      },
      close: async () => {
        fakeDevice.opened = false;
      },
      selectConfiguration: async (value: number) => {
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [{ interfaceNumber: 1, alternates: [{ alternateSetting: 0 }] }],
        };
      },
      claimInterface: async () => Promise.resolve(),
      releaseInterface: async () => Promise.resolve(),
      controlTransferOut: async (setup: { request: number; value: number }, data?: BufferSource) => {
        if (setup.request === 1) {
          const view = data instanceof Uint8Array ? data : new Uint8Array(0);
          downloads.push({ value: setup.value, bytes: Array.from(view) });
        }
        return { status: "ok" as const };
      },
      controlTransferIn: async (setup: { request: number }, _length: number) => {
        if (setup.request === 5) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(2).buffer) };
        }
        if (setup.request === 3) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(0, 0, 0, 0, 5, 0).buffer) };
        }
        if (setup.request === 2) {
          return { status: "ok" as const, data: new DataView(new Uint8Array(32).buffer) };
        }
        throw new Error(`unexpected controlTransferIn request ${setup.request}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => fakeDevice,
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();
        await transport!.connect();
        if (!transport!.syncRtcClock) {
          throw new Error("syncRtcClock is unavailable on transport");
        }

        await transport!.syncRtcClock({
          year: 2026,
          month: 6,
          day: 11,
          hour: 14,
          minute: 30,
          second: 45,
        });

        const rtcPayload = downloads.find((item) => item.value === 0 && item.bytes[0] === 0xb5);
        expect(rtcPayload).toBeDefined();
        expect(rtcPayload?.bytes).toEqual([0xb5, 0x20, 0x26, 0x06, 0x11, 0x14, 0x30, 0x45]);
      },
    );
  });

  it("rejects RTC sync payloads outside supported range", async () => {
    const fakeDevice = {
      vendorId: 0x0483,
      productId: 0xdf11,
      opened: false,
      configuration: null,
      open: async () => {
        fakeDevice.opened = true;
      },
      close: async () => {
        fakeDevice.opened = false;
      },
      selectConfiguration: async (value: number) => {
        fakeDevice.configuration = {
          configurationValue: value,
          interfaces: [{ interfaceNumber: 1, alternates: [{ alternateSetting: 0 }] }],
        };
      },
      claimInterface: async () => Promise.resolve(),
      releaseInterface: async () => Promise.resolve(),
      controlTransferOut: async () => ({ status: "ok" as const }),
      controlTransferIn: async (setup: { request: number }) => {
        if (setup.request === 5) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(2).buffer) };
        }
        if (setup.request === 3) {
          return { status: "ok" as const, data: new DataView(Uint8Array.of(0, 0, 0, 0, 5, 0).buffer) };
        }
        throw new Error(`unexpected controlTransferIn request ${setup.request}`);
      },
    };

    await withMockUsb(
      {
        requestDevice: async () => fakeDevice,
      },
      async () => {
        const caps = detectBrowserRadioCapabilities(globalThis.navigator, true);
        const transport = createBrowserRadioTransport(caps);
        expect(transport).not.toBeNull();
        await transport!.connect();
        if (!transport!.syncRtcClock) {
          throw new Error("syncRtcClock is unavailable on transport");
        }

        await expect(
          transport!.syncRtcClock({
            year: 1999,
            month: 6,
            day: 11,
            hour: 14,
            minute: 30,
            second: 45,
          }),
        ).rejects.toThrow("RTC year must be between 2000 and 2099.");
      },
    );
  });
});
