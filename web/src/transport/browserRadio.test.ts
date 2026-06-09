import { describe, expect, it } from "vitest";

import { createBrowserRadioTransport, detectBrowserRadioCapabilities } from "./browserRadio";

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

    expect(createBrowserRadioTransport(supported)).not.toBeNull();
  });
});
