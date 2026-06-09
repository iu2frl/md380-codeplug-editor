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

export interface BrowserTransferProgress {
  direction: "read" | "write";
  completedBlocks: number;
  totalBlocks: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface BrowserRadioTransport {
  connect(): Promise<BrowserRadioDevice>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectedDevice(): BrowserRadioDevice | null;
  readCodeplug(onProgress?: (progress: BrowserTransferProgress) => void): Promise<Uint8Array>;
  writeCodeplug(data: Uint8Array, onProgress?: (progress: BrowserTransferProgress) => void): Promise<void>;
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
  close?: () => Promise<void>;
  selectConfiguration?: (configurationValue: number) => Promise<void>;
  claimInterface?: (interfaceNumber: number) => Promise<void>;
  releaseInterface?: (interfaceNumber: number) => Promise<void>;
  selectAlternateInterface?: (interfaceNumber: number, alternateSetting: number) => Promise<void>;
  controlTransferOut?: (setup: UsbControlTransferParametersLike, data?: BufferSource) => Promise<UsbOutTransferResultLike>;
  controlTransferIn?: (setup: UsbControlTransferParametersLike, length: number) => Promise<UsbInTransferResultLike>;
}

interface UsbControlTransferParametersLike {
  requestType: "class" | "standard" | "vendor";
  recipient: "device" | "interface" | "endpoint" | "other";
  request: number;
  value: number;
  index: number;
}

interface UsbOutTransferResultLike {
  status: "ok" | "stall" | "babble";
}

interface UsbInTransferResultLike {
  status: "ok" | "stall" | "babble";
  data?: DataView;
}

interface UsbNavigatorLike {
  requestDevice: (options: UsbRequestOptions) => Promise<UsbDeviceLike>;
}

const MD380_USB_FILTERS: UsbRequestFilter[] = [
  { vendorId: 0x0483, productId: 0xdf11 },
  { vendorId: 0x0483 },
  { classCode: 0xfe, subclassCode: 0x01, protocolCode: 0x02 },
];

const DFU_INTERFACE_CLASS = 0xfe;
const DFU_INTERFACE_SUBCLASS = 0x01;
const DFU_INTERFACE_PROTOCOL = 0x02;
const DFU_REQUEST_DNLOAD = 1;
const DFU_REQUEST_UPLOAD = 2;
const DFU_REQUEST_GETSTATUS = 3;
const DFU_REQUEST_CLRSTATUS = 4;
const DFU_REQUEST_GETSTATE = 5;
const DFU_REQUEST_ABORT = 6;
const DFU_STATE_DFU_IDLE = 2;
const DFU_STATE_DFU_DNLOAD_IDLE = 5;
const DFU_STATE_DFU_UPLOAD_IDLE = 9;
const DFU_STATE_DFU_ERROR = 10;
const CODEPLUG_BLOCK_SIZE = 1024;
const CODEPLUG_TOTAL_SIZE = 262144;
const CODEPLUG_BLOCK_START = 2;
const CODEPLUG_BLOCK_COUNT = CODEPLUG_TOTAL_SIZE / CODEPLUG_BLOCK_SIZE;

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
  private device: UsbDeviceLike | null = null;
  private claimedInterfaceNumber: number | null = null;
  private connectedDevice: BrowserRadioDevice | null = null;

  constructor(usb: UsbNavigatorLike) {
    this.usb = usb;
  }

  async connect(): Promise<BrowserRadioDevice> {
    if (this.device?.opened && this.connectedDevice) {
      return this.connectedDevice;
    }

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

      if (typeof device.claimInterface !== "function") {
        throw new Error("Browser cannot claim the selected USB interface.");
      }
      await device.claimInterface(selectedInterface.interfaceNumber);

      const alternate = pickAlternate(selectedInterface);
      if (alternate && typeof device.selectAlternateInterface === "function") {
        await device.selectAlternateInterface(selectedInterface.interfaceNumber, alternate.alternateSetting);
      }

      this.device = device;
      this.claimedInterfaceNumber = selectedInterface.interfaceNumber;
      this.connectedDevice = {
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        manufacturerName: device.manufacturerName,
        serialNumber: device.serialNumber,
        configurationValue: configuration.configurationValue,
        interfaceNumber: selectedInterface.interfaceNumber,
      };
      return this.connectedDevice;
    } catch (error) {
      throw new Error(normalizeUsbError(error));
    }
  }

  async disconnect(): Promise<void> {
    if (!this.device) {
      return;
    }

    try {
      if (this.claimedInterfaceNumber !== null && typeof this.device.releaseInterface === "function") {
        await this.device.releaseInterface(this.claimedInterfaceNumber);
      }

      if (this.device.opened && typeof this.device.close === "function") {
        await this.device.close();
      }
    } catch (error) {
      throw new Error(normalizeUsbError(error));
    } finally {
      this.device = null;
      this.claimedInterfaceNumber = null;
      this.connectedDevice = null;
    }
  }

  isConnected(): boolean {
    return Boolean(this.device?.opened && this.connectedDevice);
  }

  getConnectedDevice(): BrowserRadioDevice | null {
    return this.connectedDevice;
  }

  async readCodeplug(onProgress?: (progress: BrowserTransferProgress) => void): Promise<Uint8Array> {
    const device = this.requireConnectedDevice();
    await this.enterCodeplugTransferMode(device, false);
    await this.setAddress(device, 0x00000000);

    const out = new Uint8Array(CODEPLUG_TOTAL_SIZE);
    onProgress?.({
      direction: "read",
      completedBlocks: 0,
      totalBlocks: CODEPLUG_BLOCK_COUNT,
      bytesTransferred: 0,
      totalBytes: CODEPLUG_TOTAL_SIZE,
    });
    for (let index = 0; index < CODEPLUG_BLOCK_COUNT; index += 1) {
      const blockNumber = CODEPLUG_BLOCK_START + index;
      const block = await this.upload(device, blockNumber, CODEPLUG_BLOCK_SIZE);
      if (block.byteLength !== CODEPLUG_BLOCK_SIZE) {
        throw new Error(`Short codeplug block at ${blockNumber}: expected ${CODEPLUG_BLOCK_SIZE} bytes, got ${block.byteLength}.`);
      }
      out.set(block, index * CODEPLUG_BLOCK_SIZE);
      await this.getStatus(device);
      onProgress?.({
        direction: "read",
        completedBlocks: index + 1,
        totalBlocks: CODEPLUG_BLOCK_COUNT,
        bytesTransferred: (index + 1) * CODEPLUG_BLOCK_SIZE,
        totalBytes: CODEPLUG_TOTAL_SIZE,
      });
    }

    return out;
  }

  async writeCodeplug(data: Uint8Array, onProgress?: (progress: BrowserTransferProgress) => void): Promise<void> {
    const device = this.requireConnectedDevice();
    if (data.byteLength !== CODEPLUG_TOTAL_SIZE) {
      throw new Error(`Codeplug write expects ${CODEPLUG_TOTAL_SIZE} bytes, received ${data.byteLength}.`);
    }

    await this.enterCodeplugTransferMode(device, true);
    for (const address of [0x00000000, 0x00010000, 0x00020000, 0x00030000]) {
      await this.eraseBlock(device, address);
    }
    await this.setAddress(device, 0x00000000);

    onProgress?.({
      direction: "write",
      completedBlocks: 0,
      totalBlocks: CODEPLUG_BLOCK_COUNT,
      bytesTransferred: 0,
      totalBytes: CODEPLUG_TOTAL_SIZE,
    });

    for (let index = 0; index < CODEPLUG_BLOCK_COUNT; index += 1) {
      const blockNumber = CODEPLUG_BLOCK_START + index;
      const start = index * CODEPLUG_BLOCK_SIZE;
      const end = start + CODEPLUG_BLOCK_SIZE;
      const block = data.subarray(start, end);
      await this.download(device, blockNumber, block);
      await this.waitForDownloadIdle(device);
      onProgress?.({
        direction: "write",
        completedBlocks: index + 1,
        totalBlocks: CODEPLUG_BLOCK_COUNT,
        bytesTransferred: (index + 1) * CODEPLUG_BLOCK_SIZE,
        totalBytes: CODEPLUG_TOTAL_SIZE,
      });
    }
  }

  private requireConnectedDevice(): UsbDeviceLike {
    if (!this.device || this.claimedInterfaceNumber === null || !this.device.opened) {
      throw new Error("Connect a radio first.");
    }
    return this.device;
  }

  private interfaceIndex(): number {
    if (this.claimedInterfaceNumber === null) {
      throw new Error("No claimed USB interface for DFU transfers.");
    }
    return this.claimedInterfaceNumber;
  }

  private async enterCodeplugTransferMode(device: UsbDeviceLike, includeDoubleProgrammingMode: boolean): Promise<void> {
    await this.enterDfuIdle(device);
    await this.md380Custom(device, 0x91, 0x01);
    if (includeDoubleProgrammingMode) {
      await this.md380Custom(device, 0x91, 0x01);
    }
    await this.md380Custom(device, 0xa2, 0x02);
    await this.md380Custom(device, 0xa2, 0x02);
    await this.md380Custom(device, 0xa2, 0x03);
    await this.md380Custom(device, 0xa2, 0x04);
    await this.md380Custom(device, 0xa2, 0x07);
  }

  private async md380Custom(device: UsbDeviceLike, first: number, second: number): Promise<void> {
    await this.download(device, 0, new Uint8Array([first & 0xff, second & 0xff]));
    await this.syncStatusAndReturnIdle(device);
  }

  private async setAddress(device: UsbDeviceLike, address: number): Promise<void> {
    const payload = new Uint8Array([
      0x21,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
      (address >> 24) & 0xff,
    ]);
    await this.download(device, 0, payload);
    await this.syncStatusAndReturnIdle(device);
  }

  private async eraseBlock(device: UsbDeviceLike, address: number): Promise<void> {
    const payload = new Uint8Array([
      0x41,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
      (address >> 24) & 0xff,
    ]);
    await this.download(device, 0, payload);
    await this.syncStatusAndReturnIdle(device);
  }

  private async download(device: UsbDeviceLike, blockNumber: number, data: Uint8Array): Promise<void> {
    if (typeof device.controlTransferOut !== "function") {
      throw new Error("Browser cannot send DFU download transfers for this device.");
    }
    const result = await device.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_DNLOAD,
        value: blockNumber,
        index: this.interfaceIndex(),
      },
      data,
    );
    if (result.status !== "ok") {
      throw new Error(`USB download transfer failed with status: ${result.status}.`);
    }
  }

  private async upload(device: UsbDeviceLike, blockNumber: number, length: number): Promise<Uint8Array> {
    if (typeof device.controlTransferIn !== "function") {
      throw new Error("Browser cannot receive DFU upload transfers for this device.");
    }
    const result = await device.controlTransferIn(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_UPLOAD,
        value: blockNumber,
        index: this.interfaceIndex(),
      },
      length,
    );
    if (result.status !== "ok") {
      throw new Error(`USB upload transfer failed with status: ${result.status}.`);
    }
    if (!result.data) {
      throw new Error("USB upload transfer returned no data.");
    }
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }

  private async getStatus(device: UsbDeviceLike): Promise<number> {
    if (typeof device.controlTransferIn !== "function") {
      throw new Error("Browser cannot query DFU status for this device.");
    }
    const result = await device.controlTransferIn(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_GETSTATUS,
        value: 0,
        index: this.interfaceIndex(),
      },
      6,
    );
    if (result.status !== "ok" || !result.data || result.data.byteLength < 5) {
      throw new Error("Unable to read DFU status from USB device.");
    }
    return result.data.getUint8(4);
  }

  private async getState(device: UsbDeviceLike): Promise<number> {
    if (typeof device.controlTransferIn !== "function") {
      throw new Error("Browser cannot query DFU state for this device.");
    }
    const result = await device.controlTransferIn(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_GETSTATE,
        value: 0,
        index: this.interfaceIndex(),
      },
      1,
    );
    if (result.status !== "ok" || !result.data || result.data.byteLength < 1) {
      throw new Error("Unable to read DFU state from USB device.");
    }
    return result.data.getUint8(0);
  }

  private async clearStatus(device: UsbDeviceLike): Promise<void> {
    if (typeof device.controlTransferOut !== "function") {
      throw new Error("Browser cannot clear DFU status for this device.");
    }
    const result = await device.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_CLRSTATUS,
        value: 0,
        index: this.interfaceIndex(),
      },
      new Uint8Array(0),
    );
    if (result.status !== "ok") {
      throw new Error(`USB clear-status transfer failed with status: ${result.status}.`);
    }
  }

  private async abort(device: UsbDeviceLike): Promise<void> {
    if (typeof device.controlTransferOut !== "function") {
      throw new Error("Browser cannot send DFU abort for this device.");
    }
    const result = await device.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_REQUEST_ABORT,
        value: 0,
        index: this.interfaceIndex(),
      },
      new Uint8Array(0),
    );
    if (result.status !== "ok") {
      throw new Error(`USB abort transfer failed with status: ${result.status}.`);
    }
  }

  private async waitForDownloadIdle(device: UsbDeviceLike): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const state = await this.getStatus(device);
      if (state === DFU_STATE_DFU_DNLOAD_IDLE) {
        return;
      }
      if (state === DFU_STATE_DFU_ERROR) {
        throw new Error("DFU device entered error state during download.");
      }
    }
    throw new Error("Timed out waiting for DFU download idle state.");
  }

  private async syncStatusAndReturnIdle(device: UsbDeviceLike): Promise<void> {
    await this.getStatus(device);
    const state = await this.getStatus(device);
    if (state !== DFU_STATE_DFU_DNLOAD_IDLE) {
      throw new Error("DFU command did not complete in download-idle state.");
    }
    await this.enterDfuIdle(device);
  }

  private async enterDfuIdle(device: UsbDeviceLike): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await this.getState(device);
      if (state === DFU_STATE_DFU_IDLE) {
        return;
      }
      if (state === DFU_STATE_DFU_ERROR) {
        await this.clearStatus(device);
        continue;
      }
      if (state === DFU_STATE_DFU_DNLOAD_IDLE || state === DFU_STATE_DFU_UPLOAD_IDLE) {
        await this.abort(device);
        continue;
      }
      await this.clearStatus(device);
    }
    throw new Error("Timed out entering DFU idle state.");
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
