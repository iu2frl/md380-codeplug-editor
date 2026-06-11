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
        : renderLanding(state.importError, uiState.riskAccepted, uiState)
    }${renderGuideModal(uiState)}`;
    bindFileInputs(target, store);
    if (uiState.landingView === "callsign-workflow") {
      bindCallsignWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else if (uiState.landingView === "time-sync-workflow") {
      bindTimeSyncWorkflowActions(target, store, state, channelState, uiState, renderState);
    } else {
      bindLandingActions(target, store, state, channelState, uiState, renderState);
    }
    bindGuideModalActions(target, store, state, channelState, uiState, renderState);
    return;
  }

  if (uiState.activeTab === "channels") {
    const channelsList = target.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (channelsList) {
      uiState.channelsListScrollTop = channelsList.scrollTop;
    }
  }

  target.innerHTML = `${renderLoadedLayout(state, uiState)}${renderGuideModal(uiState)}`;
  bindFileInputs(target, store);
  bindTopActions(target, store, state);
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

  if (uiState.activeTab === "channels") {
    const channelsList = target.querySelector<HTMLElement>("#active-tab-panel .pane-left .list");
    if (channelsList) {
      channelsList.scrollTop = uiState.channelsListScrollTop;
    }
  }
}
