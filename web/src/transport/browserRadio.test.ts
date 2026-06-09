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
        const connected = await transport!.connect();
        expect(connected.vendorId).toBe(0x0483);
        expect(connected.productId).toBe(0xdf11);
        expect(connected.interfaceNumber).toBe(2);
        expect(calls).toEqual([
          "requestDevice",
          "open",
          "selectConfiguration:1",
          "selectAlternate:2:1",
          "claimInterface:2",
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
});
