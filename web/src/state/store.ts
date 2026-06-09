import { parseCodeplug, serializeCodeplug } from "../domain/parser";
import type { CodeplugDocument, ValidationIssue } from "../domain/types";
import { validateDocument } from "../domain/validation";

export interface AppState {
  document?: CodeplugDocument;
  originalBytes?: Uint8Array;
  validationIssues: ValidationIssue[];
  isDirty: boolean;
  undoCount: number;
  redoCount: number;
  importError?: string;
}

type Listener = (state: AppState) => void;

export class EditorStore {
  private state: AppState = {
    validationIssues: [],
    isDirty: false,
    undoCount: 0,
    redoCount: 0,
  };

  private listeners: Listener[] = [];
  private undoStack: CodeplugDocument[] = [];
  private redoStack: CodeplugDocument[] = [];
  private baselineDocument?: CodeplugDocument;

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

  /** Load a pre-parsed document directly — useful for testing. */
  loadDocument(document: CodeplugDocument): void {
    this.undoStack = [];
    this.redoStack = [];
    this.baselineDocument = this.cloneDocument(document);
    this.state = {
      document,
      originalBytes: undefined,
      validationIssues: validateDocument(document),
      isDirty: false,
      undoCount: 0,
      redoCount: 0,
      importError: undefined,
    };
    this.emit();
  }

  load(fileName: string, bytes: Uint8Array): void {
    try {
      const document = parseCodeplug(fileName, bytes);
      this.undoStack = [];
      this.redoStack = [];
      this.baselineDocument = this.cloneDocument(document);
      this.state = {
        document,
        originalBytes: bytes,
        validationIssues: validateDocument(document),
        isDirty: false,
        undoCount: 0,
        redoCount: 0,
        importError: undefined,
      };
    } catch (error) {
      this.undoStack = [];
      this.redoStack = [];
      this.baselineDocument = undefined;
      this.state = {
        validationIssues: [],
        isDirty: false,
        undoCount: 0,
        redoCount: 0,
        importError: error instanceof Error ? error.message : "Failed to import file.",
      };
    }
    this.emit();
  }

  undo(): void {
    if (!this.state.document || this.undoStack.length === 0) {
      return;
    }

    this.redoStack.push(this.cloneDocument(this.state.document));
    this.state.document = this.undoStack.pop();
    this.refreshDirty();
  }

  redo(): void {
    if (!this.state.document || this.redoStack.length === 0) {
      return;
    }

    this.undoStack.push(this.cloneDocument(this.state.document));
    this.state.document = this.redoStack.pop();
    this.refreshDirty();
  }

  updateSettings(radioName: string, radioId: number): void {
    if (!this.state.document) {
      return;
    }

    this.beginMutation();
    this.state.document.settings.radioName = radioName;
    this.state.document.settings.radioId = radioId;
    this.refreshDirty();
  }

  addContact(): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
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
    this.beginMutation();
    contact.name = name;
    contact.callId = callId;
    this.refreshDirty();
  }

  removeContact(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
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
    this.beginMutation();
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
    this.beginMutation();
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

  bulkUpdateChannels(
    channelIds: number[],
    patch: {
      channelMode?: "Analog" | "Digital";
      power?: "Low" | "High";
      colorCode?: number;
      repeaterSlot?: 1 | 2;
      bandwidthKhz?: "12.5" | "20" | "25";
    },
  ): void {
    if (!this.state.document || channelIds.length === 0) {
      return;
    }

    this.beginMutation();
    const idSet = new Set(channelIds);
    for (const channel of this.state.document.channels) {
      if (!idSet.has(channel.id)) {
        continue;
      }
      if (patch.channelMode !== undefined) {
        channel.channelMode = patch.channelMode;
      }
      if (patch.power !== undefined) {
        channel.power = patch.power;
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
    }

    this.refreshDirty();
  }

  removeChannel(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
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
    this.beginMutation();
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
    this.beginMutation();
    zone.name = name;
    zone.channelIds = channelIds.slice(0, 16);
    this.refreshDirty();
  }

  removeZone(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
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

  private beginMutation(): void {
    if (!this.state.document) {
      return;
    }
    this.undoStack.push(this.cloneDocument(this.state.document));
    this.redoStack = [];
  }

  private cloneDocument(document: CodeplugDocument): CodeplugDocument {
    return JSON.parse(JSON.stringify(document)) as CodeplugDocument;
  }

  private refreshDirty(): void {
    if (!this.state.document) {
      return;
    }
    this.state.validationIssues = validateDocument(this.state.document);
    this.state.undoCount = this.undoStack.length;
    this.state.redoCount = this.redoStack.length;
    this.state.isDirty =
      this.baselineDocument !== undefined &&
      JSON.stringify(this.state.document) !== JSON.stringify(this.baselineDocument);
    this.emit();
  }

  notifySubscribers(): void {
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
