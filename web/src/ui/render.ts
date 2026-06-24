import type { AppState, EditorStore } from "../state/store";
import type { ChannelPanelState, UiState } from "./uiTypes";
import { createInitialChannelPanelState, createInitialUiState } from "./uiTypes";
import {
  bindCallsignWorkflowActions,
  renderCallsignWorkflow,
} from "./callsignWorkflow";
import {
  bindTimeSyncWorkflowActions,
  renderTimeSyncWorkflow,
} from "./timeSyncWorkflow";
import {
  bindScreenshotWorkflowActions,
  renderScreenshotWorkflow,
} from "./screenshotWorkflow";
import {
  bindFirmwareWorkflowActions,
  renderFirmwareWorkflow,
} from "./firmwareWorkflow";
import {
  bindGuideModalActions,
  bindLandingActions,
  renderGuideModal,
  renderLanding,
} from "./landing";
import {
  bindActiveTab,
  bindFileInputs,
  bindTabs,
  bindTopActions,
  renderActiveTab,
  renderLoadedLayout,
} from "./codeplugEditor";

export function renderApp(target: HTMLElement, store: EditorStore): void {
  const channelState: ChannelPanelState = createInitialChannelPanelState();
  const uiState: UiState = createInitialUiState();

  store.subscribe((state) => renderState(target, store, state, channelState, uiState));
}

interface ScrollSnapshotEntry {
  path: number[];
  signature: string;
  top: number;
  left: number;
}

function elementSignature(element: Element): string {
  return `${element.tagName}#${element.id}.${element.className}`;
}

function pathFromRoot(root: HTMLElement, element: Element): number[] | null {
  const path: number[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      return null;
    }
    path.unshift(Array.prototype.indexOf.call(parent.children, current));
    current = parent;
  }
  return current === root ? path : null;
}

// Capture the scroll offset of every scrolled element so a full innerHTML
// rebuild does not visibly jump the page or any inner list back to the top.
function captureScrollPositions(root: HTMLElement): ScrollSnapshotEntry[] {
  const entries: ScrollSnapshotEntry[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.scrollTop > 0 || element.scrollLeft > 0) {
      const path = pathFromRoot(root, element);
      if (path) {
        entries.push({
          path,
          signature: elementSignature(element),
          top: element.scrollTop,
          left: element.scrollLeft,
        });
      }
    }
  }
  return entries;
}

function restoreScrollPositions(root: HTMLElement, entries: ScrollSnapshotEntry[]): void {
  for (const entry of entries) {
    let current: Element | null = root;
    for (const index of entry.path) {
      current = current?.children.item(index) ?? null;
    }
    // Only restore when the element at this location is structurally the same
    // node, so a changed layout never receives a stale scroll offset.
    if (current instanceof HTMLElement && elementSignature(current) === entry.signature) {
      current.scrollTop = entry.top;
      current.scrollLeft = entry.left;
    }
  }
}

function renderState(
  target: HTMLElement,
  store: EditorStore,
  state: AppState,
  channelState: ChannelPanelState,
  uiState: UiState,
): void {
  if (!state.document) {
    target.innerHTML = `${
      uiState.landingView === "callsign-workflow"
        ? renderCallsignWorkflow(uiState)
        : uiState.landingView === "time-sync-workflow"
          ? renderTimeSyncWorkflow(uiState)
          : uiState.landingView === "screenshot-workflow"
            ? renderScreenshotWorkflow(uiState)
            : uiState.landingView === "firmware-workflow"
              ? renderFirmwareWorkflow(uiState)
              : renderLanding(state.importError, uiState.riskAccepted, uiState)
    }${renderGuideModal(uiState)}`;
    bindFileInputs(target, store);
    if (uiState.landingView === "callsign-workflow") {
      bindCallsignWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else if (uiState.landingView === "time-sync-workflow") {
      bindTimeSyncWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else if (uiState.landingView === "screenshot-workflow") {
      bindScreenshotWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else if (uiState.landingView === "firmware-workflow") {
      bindFirmwareWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else {
      bindLandingActions(target, store, state, channelState, uiState, renderState);
    }
    bindGuideModalActions(target, store, state, channelState, uiState, renderState);
    return;
  }

  // Preserve scroll positions across the full re-render, but only when staying
  // on the same tab — switching tabs intentionally starts fresh at the top.
  const sameTabRender = uiState.lastRenderedTab === uiState.activeTab;
  const preservedWindowScroll = { x: window.scrollX, y: window.scrollY };
  const preservedScroll = sameTabRender ? captureScrollPositions(target) : [];

  target.innerHTML = `${renderLoadedLayout(state, uiState)}${renderGuideModal(uiState)}`;
  bindFileInputs(target, store);
  bindTopActions(target, store, state, channelState, uiState);
  bindTabs(target, uiState, state, store, channelState, renderState);
  bindGuideModalActions(target, store, state, channelState, uiState, renderState);

  const activeTab = target.querySelector<HTMLElement>("#active-tab-panel");
  const validation = target.querySelector<HTMLElement>("#validation");
  if (!activeTab || !validation) {
    return;
  }

  const { document } = state;
  const activeContent = renderActiveTab(document, uiState.activeTab, channelState, uiState);
  activeTab.innerHTML = activeContent;

  validation.innerHTML = `
    <h2>Validation</h2>
    ${
      state.validationIssues.length === 0
        ? "<p class=\"ok\">No validation issues.</p>"
        : `<ul>${state.validationIssues
            .map((issue) => `<li class="${issue.level}">[${issue.code}] ${issue.message}</li>`)
            .join("")}</ul>`
    }
  `;

  bindActiveTab(target, store, state, channelState, uiState, renderState);

  if (sameTabRender) {
    restoreScrollPositions(target, preservedScroll);
    window.scrollTo(preservedWindowScroll.x, preservedWindowScroll.y);
  }
  uiState.lastRenderedTab = uiState.activeTab;
}
