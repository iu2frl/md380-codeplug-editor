import { createBlankCodeplugBytes, parseCodeplug, serializeCodeplug } from "../domain/parser";
import type { Channel, CodeplugDocument, ValidationIssue } from "../domain/types";
import { validateDocument } from "../domain/validation";

function syncChannelTxFrequency(channel: Channel): void {
  channel.txFrequencyMHz = Number((channel.rxFrequencyMHz + channel.txOffsetMHz).toFixed(5));
}

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

  createBlank(model: "MD380" | "MD390" = "MD380", format: "bin" | "rdt" = "bin"): void {
    const lowerModel = model.toLowerCase();
    const fileName = format === "rdt" ? `blank-${lowerModel}.rdt` : `blank-${lowerModel}.bin`;
    this.load(fileName, createBlankCodeplugBytes(format, model));
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

  updateSettings(patch: Partial<CodeplugDocument["settings"]>): void {
    if (!this.state.document) {
      return;
    }

    this.beginMutation();
    this.state.document.settings = {
      ...this.state.document.settings,
      ...patch,
    };
    this.refreshDirty();
  }

  updateMenuSettings(patch: Partial<CodeplugDocument["menuSettings"]>): void {
    if (!this.state.document) {
      return;
    }

    this.beginMutation();
    this.state.document.menuSettings = {
      ...this.state.document.menuSettings,
      ...patch,
    };
    this.refreshDirty();
  }

  updateRadioButtonAssignment(id: number, actionCode: number): void {
    if (!this.state.document) {
      return;
    }
    const assignment = this.state.document.radioButtons.find((item) => item.id === id);
    if (!assignment) {
      return;
    }
    this.beginMutation();
    assignment.actionCode = actionCode;
    this.refreshDirty();
  }

  updateLongPressDurationMs(value: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    this.state.document.longPressDurationMs = value;
    this.refreshDirty();
  }

  addTextMessage(): void {
    if (!this.state.document) {
      return;
    }
    if (this.state.document.textMessages.length >= 50) {
      return;
    }

    this.beginMutation();
    const usedSlots = new Set(this.state.document.textMessages.map((item) => item.slot));
    let slot: number | undefined;
    for (let index = 1; index <= 50; index += 1) {
      if (!usedSlots.has(index)) {
        slot = index;
        break;
      }
    }
    if (!slot) {
      return;
    }
    const id = this.nextId(this.state.document.textMessages.map((item) => item.id));
    this.state.document.textMessages.push({ id, text: `Message ${id}`, slot });
    this.refreshDirty();
  }

  updateTextMessage(id: number, text: string): void {
    if (!this.state.document) {
      return;
    }
    const message = this.state.document.textMessages.find((item) => item.id === id);
    if (!message) {
      return;
    }
    this.beginMutation();
    message.text = text;
    this.refreshDirty();
  }

  removeTextMessage(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    this.state.document.textMessages = this.state.document.textMessages.filter((item) => item.id !== id);
    this.refreshDirty();
  }

  updatePrivacySettings(patch: Partial<CodeplugDocument["privacySettings"]>): void {
    if (!this.state.document) {
      return;
    }

    this.beginMutation();
    this.state.document.privacySettings = {
      ...this.state.document.privacySettings,
      ...patch,
    };
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

  addGroupList(): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    const id = this.nextId(this.state.document.groupLists.map((list) => list.id));
    this.state.document.groupLists.push({
      id,
      name: `Group List ${id}`,
    });
    this.refreshDirty();
  }

  updateGroupList(id: number, name: string): void {
    if (!this.state.document) {
      return;
    }
    const groupList = this.state.document.groupLists.find((item) => item.id === id);
    if (!groupList) {
      return;
    }
    this.beginMutation();
    groupList.name = name;
    this.refreshDirty();
  }

  removeGroupList(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    this.state.document.groupLists = this.state.document.groupLists.filter((item) => item.id !== id);
    for (const channel of this.state.document.channels) {
      if (channel.groupListId === id) {
        channel.groupListId = undefined;
      }
    }
    this.refreshDirty();
  }

  addScanList(): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    const id = this.nextId(this.state.document.scanLists.map((list) => list.id));
    this.state.document.scanLists.push({
      id,
      name: `Scan List ${id}`,
    });
    this.refreshDirty();
  }

  updateScanList(id: number, name: string): void {
    if (!this.state.document) {
      return;
    }
    const scanList = this.state.document.scanLists.find((item) => item.id === id);
    if (!scanList) {
      return;
    }
    this.beginMutation();
    scanList.name = name;
    this.refreshDirty();
  }

  removeScanList(id: number): void {
    if (!this.state.document) {
      return;
    }
    this.beginMutation();
    this.state.document.scanLists = this.state.document.scanLists.filter((item) => item.id !== id);
    for (const channel of this.state.document.channels) {
      if (channel.scanListId === id) {
        channel.scanListId = undefined;
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
      txOffsetMHz: 0,
      channelMode: "Digital",
      admitCriteria: "Always",
      inCallCriteria: "Always",
      rxOnly: "Off",
      autoscan: "Off",
      loneWorker: "Off",
      vox: "Off",
      allowTalkaround: "Off",
      talkaround: "Off",
      privateCallConfirmed: "Off",
      dataCallConfirmed: "Off",
      emergencyAlarmAck: "Off",
      compressedUdpDataHeader: "On",
      displayPttId: "Off",
      privacy: "None",
      privacyNumber: 1,
      emergencySystem: 0,
      totSec: 60,
      totRekeyDelaySec: 0,
      rxRefFrequency: "Low",
      txRefFrequency: "Low",
      rxSignallingSystem: "Off",
      txSignallingSystem: "Off",
      ctcssDecode: "None",
      ctcssEncode: "None",
      qtReverse: "180",
      reverseBurst: "On",
      decode1: "Off",
      decode2: "Off",
      decode3: "Off",
      decode4: "Off",
      decode5: "Off",
      decode6: "Off",
      decode7: "Off",
      decode8: "Off",
      dcdmSwitch: "Off",
      leaderMs: "Off",
      allowInterrupt: "Off",
      nonQtDqtTurnoffFreq: "None",
      receiveGpsInfo: "Off",
      sendGpsInfo: "Off",
      colorCode: 1,
      repeaterSlot: 1,
      bandwidthKhz: "12.5",
      power: "High",
      _dirty: true,
    });
    this.refreshDirty();
  }

  updateChannel(
    id: number,
    patch: {
      name?: string;
      contactId?: number;
      scanListId?: number;
      groupListId?: number;
      rxFrequencyMHz?: number;
      txFrequencyMHz?: number;
      txOffsetMHz?: number;
      channelMode?: "Analog" | "Digital";
      admitCriteria?: "Always" | "Channel free" | "CTCSS/DCS" | "Color code";
      inCallCriteria?: "Always" | "Follow Admit Criteria";
      rxOnly?: "On" | "Off";
      autoscan?: "On" | "Off";
      loneWorker?: "On" | "Off";
      vox?: "On" | "Off";
      allowTalkaround?: "On" | "Off";
      talkaround?: "On" | "Off";
      privateCallConfirmed?: "On" | "Off";
      dataCallConfirmed?: "On" | "Off";
      emergencyAlarmAck?: "On" | "Off";
      compressedUdpDataHeader?: "On" | "Off";
      displayPttId?: "On" | "Off";
      privacy?: "None" | "Basic" | "Enhanced";
      privacyNumber?: number;
      emergencySystem?: number;
      totSec?: number | "Infinite";
      totRekeyDelaySec?: number;
      rxRefFrequency?: "Low" | "Medium" | "High";
      txRefFrequency?: "Low" | "Medium" | "High";
      rxSignallingSystem?: "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4";
      txSignallingSystem?: "Off" | "DTMF-1" | "DTMF-2" | "DTMF-3" | "DTMF-4";
      ctcssDecode?: string;
      ctcssEncode?: string;
      qtReverse?: "180" | "120";
      reverseBurst?: "On" | "Off";
      decode1?: "On" | "Off";
      decode2?: "On" | "Off";
      decode3?: "On" | "Off";
      decode4?: "On" | "Off";
      decode5?: "On" | "Off";
      decode6?: "On" | "Off";
      decode7?: "On" | "Off";
      decode8?: "On" | "Off";
      dcdmSwitch?: "On" | "Off";
      leaderMs?: "On" | "Off";
      allowInterrupt?: "On" | "Off";
      nonQtDqtTurnoffFreq?: "259.2 Hz" | "55.2 Hz" | "None" | "Raw-1";
      receiveGpsInfo?: "On" | "Off";
      sendGpsInfo?: "On" | "Off";
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
    if (patch.scanListId !== undefined || Object.hasOwn(patch, "scanListId")) {
      channel.scanListId = patch.scanListId;
    }
    if (patch.groupListId !== undefined || Object.hasOwn(patch, "groupListId")) {
      channel.groupListId = patch.groupListId;
    }
    if (patch.rxFrequencyMHz !== undefined) {
      channel.rxFrequencyMHz = patch.rxFrequencyMHz;
    }
    if (patch.txOffsetMHz !== undefined) {
      channel.txOffsetMHz = patch.txOffsetMHz;
    }
    if (patch.channelMode !== undefined) {
      channel.channelMode = patch.channelMode;
    }
    if (patch.admitCriteria !== undefined) {
      channel.admitCriteria = patch.admitCriteria;
    }
    if (patch.inCallCriteria !== undefined) {
      channel.inCallCriteria = patch.inCallCriteria;
    }
    if (patch.rxOnly !== undefined) {
      channel.rxOnly = patch.rxOnly;
    }
    if (patch.autoscan !== undefined) {
      channel.autoscan = patch.autoscan;
    }
    if (patch.loneWorker !== undefined) {
      channel.loneWorker = patch.loneWorker;
    }
    if (patch.vox !== undefined) {
      channel.vox = patch.vox;
    }
    if (patch.allowTalkaround !== undefined) {
      channel.allowTalkaround = patch.allowTalkaround;
    }
    if (patch.talkaround !== undefined) {
      channel.talkaround = patch.talkaround;
    }
    if (patch.privateCallConfirmed !== undefined) {
      channel.privateCallConfirmed = patch.privateCallConfirmed;
    }
    if (patch.dataCallConfirmed !== undefined) {
      channel.dataCallConfirmed = patch.dataCallConfirmed;
    }
    if (patch.emergencyAlarmAck !== undefined) {
      channel.emergencyAlarmAck = patch.emergencyAlarmAck;
    }
    if (patch.compressedUdpDataHeader !== undefined) {
      channel.compressedUdpDataHeader = patch.compressedUdpDataHeader;
    }
    if (patch.displayPttId !== undefined) {
      channel.displayPttId = patch.displayPttId;
    }
    if (patch.privacy !== undefined) {
      channel.privacy = patch.privacy;
    }
    if (patch.privacyNumber !== undefined) {
      channel.privacyNumber = patch.privacyNumber;
    }
    if (patch.emergencySystem !== undefined) {
      channel.emergencySystem = patch.emergencySystem;
    }
    if (patch.totSec !== undefined) {
      channel.totSec = patch.totSec;
    }
    if (patch.totRekeyDelaySec !== undefined) {
      channel.totRekeyDelaySec = patch.totRekeyDelaySec;
    }
    if (patch.rxRefFrequency !== undefined) {
      channel.rxRefFrequency = patch.rxRefFrequency;
    }
    if (patch.txRefFrequency !== undefined) {
      channel.txRefFrequency = patch.txRefFrequency;
    }
    if (patch.rxSignallingSystem !== undefined) {
      channel.rxSignallingSystem = patch.rxSignallingSystem;
    }
    if (patch.txSignallingSystem !== undefined) {
      channel.txSignallingSystem = patch.txSignallingSystem;
    }
    if (patch.ctcssDecode !== undefined) {
      channel.ctcssDecode = patch.ctcssDecode;
    }
    if (patch.ctcssEncode !== undefined) {
      channel.ctcssEncode = patch.ctcssEncode;
    }
    if (patch.qtReverse !== undefined) {
      channel.qtReverse = patch.qtReverse;
    }
    if (patch.reverseBurst !== undefined) {
      channel.reverseBurst = patch.reverseBurst;
    }
    if (patch.decode1 !== undefined) {
      channel.decode1 = patch.decode1;
    }
    if (patch.decode2 !== undefined) {
      channel.decode2 = patch.decode2;
    }
    if (patch.decode3 !== undefined) {
      channel.decode3 = patch.decode3;
    }
    if (patch.decode4 !== undefined) {
      channel.decode4 = patch.decode4;
    }
    if (patch.decode5 !== undefined) {
      channel.decode5 = patch.decode5;
    }
    if (patch.decode6 !== undefined) {
      channel.decode6 = patch.decode6;
    }
    if (patch.decode7 !== undefined) {
      channel.decode7 = patch.decode7;
    }
    if (patch.decode8 !== undefined) {
      channel.decode8 = patch.decode8;
    }
    if (patch.dcdmSwitch !== undefined) {
      channel.dcdmSwitch = patch.dcdmSwitch;
    }
    if (patch.leaderMs !== undefined) {
      channel.leaderMs = patch.leaderMs;
    }
    if (patch.allowInterrupt !== undefined) {
      channel.allowInterrupt = patch.allowInterrupt;
    }
    if (patch.nonQtDqtTurnoffFreq !== undefined) {
      channel.nonQtDqtTurnoffFreq = patch.nonQtDqtTurnoffFreq;
    }
    if (patch.receiveGpsInfo !== undefined) {
      channel.receiveGpsInfo = patch.receiveGpsInfo;
    }
    if (patch.sendGpsInfo !== undefined) {
      channel.sendGpsInfo = patch.sendGpsInfo;
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
    syncChannelTxFrequency(channel);
    channel._dirty = true;
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
      rxFrequencyMHz?: number;
      txFrequencyMHz?: number;
      txOffsetMHz?: number;
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

      if (patch.rxFrequencyMHz !== undefined) {
        channel.rxFrequencyMHz = patch.rxFrequencyMHz;
      }
      if (patch.txOffsetMHz !== undefined) {
        channel.txOffsetMHz = patch.txOffsetMHz;
      }

      syncChannelTxFrequency(channel);

      channel._dirty = true;
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
