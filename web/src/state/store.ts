import { parseCodeplug, serializeCodeplug } from "../domain/parser";
import type { CodeplugDocument, ValidationIssue } from "../domain/types";
import { validateDocument } from "../domain/validation";

export interface AppState {
  document?: CodeplugDocument;
  originalBytes?: Uint8Array;
  validationIssues: ValidationIssue[];
  isDirty: boolean;
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
    const document = parseCodeplug(fileName, bytes);
    this.state = {
      document,
      originalBytes: bytes,
      validationIssues: validateDocument(document),
      isDirty: false,
    };
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

  exportBytes(): Uint8Array | undefined {
    if (!this.state.originalBytes || !this.state.document) {
      return undefined;
    }
    return serializeCodeplug(this.state.document, this.state.originalBytes);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
