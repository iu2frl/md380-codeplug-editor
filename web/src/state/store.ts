import { parseCodeplug, serializeCodeplug } from "../domain/parser";
import type { CodeplugDocument, ValidationIssue } from "../domain/types";
import { validateDocument } from "../domain/validation";

export interface AppState {
  document?: CodeplugDocument;
  originalBytes?: Uint8Array;
  validationIssues: ValidationIssue[];
  isDirty: boolean;
  importError?: string;
}

type Listener = (state: AppState) => void;

export class EditorStore {
  private state: AppState = {
    validationIssues: [],
    isDirty: false,
  };

  private listeners: Listener[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }

  getState(): AppState {
    return this.state;
  }

  load(fileName: string, bytes: Uint8Array): void {
    try {
      const document = parseCodeplug(fileName, bytes);
      this.state = {
        document,
        originalBytes: bytes,
        validationIssues: validateDocument(document),
        isDirty: false,
        importError: undefined,
      };
    } catch (error) {
      this.state = {
        validationIssues: [],
        isDirty: false,
        importError: error instanceof Error ? error.message : "Failed to import file.",
      };
    }
    this.emit();
  }

  updateSettings(radioName: string, radioId: number): void {
    if (!this.state.document) {
      return;
    }

    this.state.document.settings.radioName = radioName;
    this.state.document.settings.radioId = radioId;
    this.state.validationIssues = validateDocument(this.state.document);
    this.state.isDirty = true;
    this.emit();
  }

  addContact(): void {
    if (!this.state.document) {
      return;
    }
    const id = this.nextId(this.state.document.contacts.map((contact) => contact.id));
    this.state.document.contacts.push({
      id,
      name: `Contact ${id}`,
      callId: id,
    });
    this.refreshDirty();
  }

  updateContact(id: number, name: string, callId: number): void {
    if (!this.state.document) {
      return;
    }
    const contact = this.state.document.contacts.find((item) => item.id === id);
    if (!contact) {
      return;
    }
    contact.name = name;
    contact.callId = callId;
    this.refreshDirty();
  }

  removeContact(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.state.document.contacts = this.state.document.contacts.filter((item) => item.id !== id);
    for (const channel of this.state.document.channels) {
      if (channel.contactId === id) {
        channel.contactId = undefined;
      }
    }
    this.refreshDirty();
  }

  addChannel(): void {
    if (!this.state.document) {
      return;
    }
    const id = this.nextId(this.state.document.channels.map((channel) => channel.id));
    this.state.document.channels.push({
      id,
      name: `Channel ${id}`,
      rxFrequencyMHz: 446.0,
      txFrequencyMHz: 446.0,
      channelMode: "Digital",
      colorCode: 1,
      repeaterSlot: 1,
      bandwidthKhz: "12.5",
      power: "High",
    });
    this.refreshDirty();
  }

  updateChannel(
    id: number,
    patch: {
      name?: string;
      contactId?: number;
      rxFrequencyMHz?: number;
      txFrequencyMHz?: number;
      channelMode?: "Analog" | "Digital";
      colorCode?: number;
      repeaterSlot?: 1 | 2;
      bandwidthKhz?: "12.5" | "20" | "25";
      power?: "Low" | "High";
    },
  ): void {
    if (!this.state.document) {
      return;
    }
    const channel = this.state.document.channels.find((item) => item.id === id);
    if (!channel) {
      return;
    }
    if (patch.name !== undefined) {
      channel.name = patch.name;
    }
    if (patch.contactId !== undefined || Object.hasOwn(patch, "contactId")) {
      channel.contactId = patch.contactId;
    }
    if (patch.rxFrequencyMHz !== undefined) {
      channel.rxFrequencyMHz = patch.rxFrequencyMHz;
    }
    if (patch.txFrequencyMHz !== undefined) {
      channel.txFrequencyMHz = patch.txFrequencyMHz;
    }
    if (patch.channelMode !== undefined) {
      channel.channelMode = patch.channelMode;
    }
    if (patch.colorCode !== undefined) {
      channel.colorCode = patch.colorCode;
    }
    if (patch.repeaterSlot !== undefined) {
      channel.repeaterSlot = patch.repeaterSlot;
    }
    if (patch.bandwidthKhz !== undefined) {
      channel.bandwidthKhz = patch.bandwidthKhz;
    }
    if (patch.power !== undefined) {
      channel.power = patch.power;
    }
    this.refreshDirty();
  }

  removeChannel(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.state.document.channels = this.state.document.channels.filter((item) => item.id !== id);
    for (const zone of this.state.document.zones) {
      zone.channelIds = zone.channelIds.filter((channelId) => channelId !== id);
    }
    this.refreshDirty();
  }

  addZone(): void {
    if (!this.state.document) {
      return;
    }
    const id = this.nextId(this.state.document.zones.map((zone) => zone.id));
    this.state.document.zones.push({
      id,
      name: `Zone ${id}`,
      channelIds: [],
    });
    this.refreshDirty();
  }

  updateZone(id: number, name: string, channelIds: number[]): void {
    if (!this.state.document) {
      return;
    }
    const zone = this.state.document.zones.find((item) => item.id === id);
    if (!zone) {
      return;
    }
    zone.name = name;
    zone.channelIds = channelIds.slice(0, 16);
    this.refreshDirty();
  }

  removeZone(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.state.document.zones = this.state.document.zones.filter((item) => item.id !== id);
    this.refreshDirty();
  }

  exportBytes(): Uint8Array | undefined {
    if (!this.state.originalBytes || !this.state.document) {
      return undefined;
    }
    return serializeCodeplug(this.state.document, this.state.originalBytes);
  }

  private nextId(ids: number[]): number {
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  }

  private refreshDirty(): void {
    if (!this.state.document) {
      return;
    }
    this.state.validationIssues = validateDocument(this.state.document);
    this.state.isDirty = true;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
