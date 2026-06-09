export interface BrowserRadioCapabilities {
  isSecureContext: boolean;
  hasNavigatorUsb: boolean;
  hasRequestDevice: boolean;
  userAgent: string;
  supported: boolean;
  blockers: string[];
  warnings: string[];
}

export interface BrowserRadioDevice {
  vendorId: number;
  productId: number;
  productName?: string;
}

export interface BrowserRadioTransport {
  connect(): Promise<BrowserRadioDevice>;
  readCodeplug(): Promise<Uint8Array>;
  writeCodeplug(data: Uint8Array): Promise<void>;
}

export function detectBrowserRadioCapabilities(
  nav: Navigator | undefined = globalThis.navigator,
  secureContext: boolean = Boolean(globalThis.isSecureContext),
): BrowserRadioCapabilities {
  const navigatorWithUsb = nav as Navigator & { usb?: { requestDevice?: unknown } };
  const hasNavigatorUsb = typeof navigatorWithUsb?.usb !== "undefined";
  const hasRequestDevice = typeof navigatorWithUsb?.usb?.requestDevice === "function";
  const userAgent = nav?.userAgent ?? "unknown";

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!secureContext) {
    blockers.push("Secure context required. Use HTTPS or localhost.");
  }
  if (!hasNavigatorUsb || !hasRequestDevice) {
    blockers.push("WebUSB API is unavailable in this browser.");
  }

  if (!/Chrome|Chromium|Edg\//i.test(userAgent)) {
    warnings.push("Best support today is Chromium-based browsers.");
  }

  return {
    isSecureContext: secureContext,
    hasNavigatorUsb,
    hasRequestDevice,
    userAgent,
    supported: blockers.length === 0,
    blockers,
    warnings,
  };
}

class WebUsbRadioTransport implements BrowserRadioTransport {
  async connect(): Promise<BrowserRadioDevice> {
    throw new Error("Phase 3 transport connect is not implemented yet.");
  }

  async readCodeplug(): Promise<Uint8Array> {
    throw new Error("Phase 3 transport read is not implemented yet.");
  }

  async writeCodeplug(_data: Uint8Array): Promise<void> {
    throw new Error("Phase 3 transport write is not implemented yet.");
  }
}

export function createBrowserRadioTransport(
  capabilities: BrowserRadioCapabilities = detectBrowserRadioCapabilities(),
): BrowserRadioTransport | null {
  if (!capabilities.supported) {
    return null;
  }
  return new WebUsbRadioTransport();
}
