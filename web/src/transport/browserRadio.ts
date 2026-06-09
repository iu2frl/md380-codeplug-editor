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
  manufacturerName?: string;
  serialNumber?: string;
  configurationValue?: number;
  interfaceNumber?: number;
}

export interface BrowserRadioTransport {
  connect(): Promise<BrowserRadioDevice>;
  readCodeplug(): Promise<Uint8Array>;
  writeCodeplug(data: Uint8Array): Promise<void>;
}

interface UsbRequestFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
}

interface UsbRequestOptions {
  filters: UsbRequestFilter[];
}

interface UsbAlternateLike {
  alternateSetting: number;
  interfaceClass?: number;
  interfaceSubclass?: number;
  interfaceProtocol?: number;
}

interface UsbInterfaceLike {
  interfaceNumber: number;
  alternates?: UsbAlternateLike[];
}

interface UsbConfigurationLike {
  configurationValue: number;
  interfaces?: UsbInterfaceLike[];
}

interface UsbDeviceLike {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  opened?: boolean;
  configuration?: UsbConfigurationLike | null;
  open?: () => Promise<void>;
  selectConfiguration?: (configurationValue: number) => Promise<void>;
  claimInterface?: (interfaceNumber: number) => Promise<void>;
  selectAlternateInterface?: (interfaceNumber: number, alternateSetting: number) => Promise<void>;
}

interface UsbNavigatorLike {
  requestDevice: (options: UsbRequestOptions) => Promise<UsbDeviceLike>;
}

const MD380_USB_FILTERS: UsbRequestFilter[] = [
  { vendorId: 0x0483, productId: 0xdf11 },
  { classCode: 0xfe, subclassCode: 0x01, protocolCode: 0x02 },
];

const DFU_INTERFACE_CLASS = 0xfe;
const DFU_INTERFACE_SUBCLASS = 0x01;
const DFU_INTERFACE_PROTOCOL = 0x02;

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
  private readonly usb: UsbNavigatorLike;

  constructor(usb: UsbNavigatorLike) {
    this.usb = usb;
  }

  async connect(): Promise<BrowserRadioDevice> {
    let device: UsbDeviceLike;
    try {
      device = await this.usb.requestDevice({ filters: MD380_USB_FILTERS });
    } catch (error) {
      throw new Error(normalizeUsbError(error));
    }

    try {
      if (!device.opened) {
        if (typeof device.open !== "function") {
          throw new Error("Selected USB device cannot be opened by this browser.");
        }
        await device.open();
      }

      if (!device.configuration) {
        if (typeof device.selectConfiguration !== "function") {
          throw new Error("Browser cannot select a USB configuration for this device.");
        }
        await device.selectConfiguration(1);
      }

      const configuration = device.configuration;
      if (!configuration) {
        throw new Error("USB device did not expose a usable configuration.");
      }

      const selectedInterface = pickInterface(configuration);
      if (!selectedInterface) {
        throw new Error("No claimable USB interface found for this radio.");
      }

      const alternate = pickAlternate(selectedInterface);
      if (alternate && typeof device.selectAlternateInterface === "function") {
        await device.selectAlternateInterface(selectedInterface.interfaceNumber, alternate.alternateSetting);
      }

      if (typeof device.claimInterface !== "function") {
        throw new Error("Browser cannot claim the selected USB interface.");
      }
      await device.claimInterface(selectedInterface.interfaceNumber);

      return {
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        manufacturerName: device.manufacturerName,
        serialNumber: device.serialNumber,
        configurationValue: configuration.configurationValue,
        interfaceNumber: selectedInterface.interfaceNumber,
      };
    } catch (error) {
      throw new Error(normalizeUsbError(error));
    }
  }

  async readCodeplug(): Promise<Uint8Array> {
    throw new Error("Phase 3 transport read is not implemented yet.");
  }

  async writeCodeplug(_data: Uint8Array): Promise<void> {
    throw new Error("Phase 3 transport write is not implemented yet.");
  }
}

function pickInterface(configuration: UsbConfigurationLike): UsbInterfaceLike | undefined {
  const interfaces = configuration.interfaces ?? [];
  if (interfaces.length === 0) {
    return undefined;
  }

  const dfu = interfaces.find((item) =>
    (item.alternates ?? []).some(
      (alternate) =>
        alternate.interfaceClass === DFU_INTERFACE_CLASS
        && alternate.interfaceSubclass === DFU_INTERFACE_SUBCLASS
        && alternate.interfaceProtocol === DFU_INTERFACE_PROTOCOL,
    ),
  );

  return dfu ?? interfaces[0];
}

function pickAlternate(usbInterface: UsbInterfaceLike): UsbAlternateLike | undefined {
  const alternates = usbInterface.alternates ?? [];
  if (alternates.length === 0) {
    return undefined;
  }

  const dfuAlternate = alternates.find(
    (alternate) =>
      alternate.interfaceClass === DFU_INTERFACE_CLASS
      && alternate.interfaceSubclass === DFU_INTERFACE_SUBCLASS
      && alternate.interfaceProtocol === DFU_INTERFACE_PROTOCOL,
  );
  return dfuAlternate ?? alternates[0];
}

function normalizeUsbError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown WebUSB error while connecting to radio.";
  }

  if (error.name === "NotFoundError") {
    return "No USB device was selected. Choose your radio in the browser prompt to continue.";
  }
  if (error.name === "SecurityError") {
    return "USB permission denied by browser security settings.";
  }
  if (error.name === "NetworkError") {
    return "USB connection failed. Reconnect the radio and try again.";
  }

  return error.message || "WebUSB connection failed.";
}

export function createBrowserRadioTransport(
  capabilities: BrowserRadioCapabilities = detectBrowserRadioCapabilities(),
  nav: Navigator | undefined = globalThis.navigator,
): BrowserRadioTransport | null {
  if (!capabilities.supported) {
    return null;
  }
  const navigatorWithUsb = nav as Navigator & { usb?: UsbNavigatorLike };
  if (!navigatorWithUsb?.usb) {
    return null;
  }
  return new WebUsbRadioTransport(navigatorWithUsb.usb);
}
