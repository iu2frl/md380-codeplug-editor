import type { CodeplugDocument, RadioVariant } from "./types";

const KNOWN_RDT_SIZE = 262709;
const KNOWN_RAW_SIZE = 262144;

function detectVariantFromSize(size: number): RadioVariant {
  if (size === KNOWN_RDT_SIZE || size === KNOWN_RAW_SIZE) {
    return "D";
  }
  return "unknown";
}

function detectFormat(fileName: string): "rdt" | "bin" | "dfu" {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".rdt")) {
    return "rdt";
  }
  if (lowerName.endsWith(".dfu")) {
    return "dfu";
  }
  return "bin";
}

export function parseCodeplug(fileName: string, bytes: Uint8Array): CodeplugDocument {
  return {
    fileName,
    format: detectFormat(fileName),
    variant: detectVariantFromSize(bytes.byteLength),
    sourceSize: bytes.byteLength,
    channels: [
      { id: 1, name: "Local Repeater", contactId: 1 },
      { id: 2, name: "Simplex", contactId: 2 },
    ],
    zones: [{ id: 1, name: "Home", channelIds: [1, 2] }],
    contacts: [
      { id: 1, name: "TG9 Local", callId: 9 },
      { id: 2, name: "Parrot", callId: 9990 },
    ],
    settings: {
      radioId: 1234567,
      radioName: "MD380",
    },
  };
}

export function serializeCodeplug(originalBytes: Uint8Array): Uint8Array {
  // Phase 1 foundation keeps byte-perfect export until binary mutation lands.
  return originalBytes;
}
