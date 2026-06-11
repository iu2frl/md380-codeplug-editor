/**
 * Callsign workflow UI tests.
 *
 * Fetch is mocked with a small in-memory fixture so no real HTTP calls are made.
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "../state/store";
import * as dialog from "./dialog";
import { renderCallsignWorkflow, bindCallsignWorkflowActions } from "./callsignWorkflow";
import { createInitialChannelPanelState, createInitialUiState } from "./uiTypes";

// ---------------------------------------------------------------------------
// Fixture CSV (matches the format validated in callsignWorkflow.ts)
// ---------------------------------------------------------------------------

const FIXTURE_CSV = [
  "RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY",
  "1234567,IK1AAA,Mario,Rossi,Roma,RM,Italy",
  "2345678,IZ2BBB,Luigi,Bianchi,Milano,MI,Italy",
  "3456789,K3CCC,John,Doe,New York,NY,USA",
].join("\n");

function makeFetchMock(csv: string): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(csv),
  } as unknown as Response);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountWorkflow(): {
  container: HTMLElement;
  store: EditorStore;
  uiState: ReturnType<typeof createInitialUiState>;
  channelState: ReturnType<typeof createInitialChannelPanelState>;
  renderState: ReturnType<typeof vi.fn>;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const store = new EditorStore();
  const uiState = createInitialUiState();
  uiState.riskAccepted = true;

  const channelState = createInitialChannelPanelState();
  const renderState = vi.fn((target: HTMLElement) => {
    target.innerHTML = renderCallsignWorkflow(uiState);
    bindCallsignWorkflowActions(target, store, store.getState(), channelState, uiState, renderState);
  });

  container.innerHTML = renderCallsignWorkflow(uiState);
  bindCallsignWorkflowActions(container, store, store.getState(), channelState, uiState, renderState);

  return { container, store, uiState, channelState, renderState };
}

async function flushAsync(): Promise<void> {
  // Flush microtasks and the 50ms yield used inside the build handler
  await vi.runAllTimersAsync();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("callsign workflow build button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", makeFetchMock(FIXTURE_CSV));
    vi.spyOn(dialog, "showToast").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("calls fetch with the expected CSV URL", async () => {
    const { container } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(fetch).toHaveBeenCalledOnce();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toMatch(/user\.csv$/);
  });

  it("sets callsignPayload after a successful build", async () => {
    const { container, uiState } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(uiState.callsignPayload).not.toBeNull();
    expect(uiState.callsignPayload!.byteLength).toBeGreaterThan(0);
  });

  it("sets callsignBusy back to false after build completes", async () => {
    const { container, uiState } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(uiState.callsignBusy).toBe(false);
  });

  it("shows success toast after a successful build", async () => {
    const { container } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("shows error toast when fetch returns non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(""),
    } as unknown as Response));

    const { container } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("shows error toast when CSV has an invalid header", async () => {
    vi.stubGlobal("fetch", makeFetchMock("BAD_HEADER\n1234567,IK1AAA,Mario,Rossi,Roma,RM,Italy"));

    const { container } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(dialog.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("does not set callsignPayload when CSV header is invalid", async () => {
    vi.stubGlobal("fetch", makeFetchMock("WRONG,HEADER\n1,X,Y,Z,A,B,C"));

    const { container, uiState } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(uiState.callsignPayload).toBeNull();
  });

  it("does not set callsignPayload when CSV body is empty", async () => {
    vi.stubGlobal("fetch", makeFetchMock("   "));

    const { container, uiState } = mountWorkflow();
    container.querySelector<HTMLButtonElement>("#callsign-workflow-build-btn")!.click();
    await flushAsync();

    expect(uiState.callsignPayload).toBeNull();
  });
});
