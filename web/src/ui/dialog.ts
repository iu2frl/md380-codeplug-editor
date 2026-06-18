/**
 * Custom dialog system for notifications and confirmations.
 * Replaces browser-native alert() and confirm() with styled UI components.
 */

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number; // ms, 0 = no auto-dismiss
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface MembershipPickerItem {
  id: number;
  label: string;
}

export interface MembershipPickerOptions {
  title: string;
  items: MembershipPickerItem[];
  selectedIds: number[];
  maxSelection: number;
  /** Plural noun used in the counter and helper text, e.g. "channels". */
  itemNoun?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ============================================================================
// Toast Notifications
// ============================================================================

let toastContainer: HTMLElement | null = null;

function ensureToastContainer(): HTMLElement {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }
  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Show a toast notification. Auto-dismisses after duration (default 4s).
 * Click to dismiss early.
 */
export function showToast(options: ToastOptions): void {
  const container = ensureToastContainer();
  const duration = options.duration ?? 4000;

  const toast = document.createElement("div");
  toast.className = `toast toast-${options.type}`;
  toast.setAttribute("role", "alert");

  const icon = getToastIcon(options.type);
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtml(options.message)}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  const dismiss = (): void => {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hiding");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    // Fallback removal if transition doesn't fire
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector(".toast-close")?.addEventListener("click", dismiss);
  toast.addEventListener("click", dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

function getToastIcon(type: ToastType): string {
  switch (type) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "warning":
      return "⚠";
    case "info":
    default:
      return "ℹ";
  }
}

// ============================================================================
// Confirmation Dialog
// ============================================================================

/**
 * Show a confirmation dialog. Returns a Promise that resolves to true (confirmed)
 * or false (cancelled).
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";

    const dialog = document.createElement("div");
    dialog.className = "dialog-card";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.setAttribute("aria-describedby", "dialog-message");

    const confirmClass = options.danger ? "button dialog-confirm dialog-confirm-danger" : "button dialog-confirm";

    dialog.innerHTML = `
      <h2 id="dialog-title" class="dialog-title">${escapeHtml(options.title)}</h2>
      <p id="dialog-message" class="dialog-message">${escapeHtml(options.message)}</p>
      <div class="dialog-actions">
        <button class="button ghost dialog-cancel">${escapeHtml(options.cancelLabel ?? "Cancel")}</button>
        <button class="${confirmClass}">${escapeHtml(options.confirmLabel ?? "Confirm")}</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Focus the cancel button by default for safety
    const cancelBtn = dialog.querySelector<HTMLButtonElement>(".dialog-cancel");
    const confirmBtn = dialog.querySelector<HTMLButtonElement>(".dialog-confirm");
    cancelBtn?.focus();

    const cleanup = (result: boolean): void => {
      backdrop.classList.add("dialog-backdrop-hiding");
      dialog.classList.add("dialog-card-hiding");
      backdrop.addEventListener("transitionend", () => backdrop.remove(), { once: true });
      setTimeout(() => backdrop.remove(), 300);
      resolve(result);
    };

    cancelBtn?.addEventListener("click", () => cleanup(false));
    confirmBtn?.addEventListener("click", () => cleanup(true));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        cleanup(false);
      }
    });

    // Handle Escape key
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        cleanup(false);
        document.removeEventListener("keydown", handleKeydown);
      }
    };
    document.addEventListener("keydown", handleKeydown);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.classList.add("dialog-backdrop-visible");
      dialog.classList.add("dialog-card-visible");
    });
  });
}

// ============================================================================
// Membership Picker Dialog
// ============================================================================

/**
 * Show a modal that lets the user add/remove items against a maximum limit.
 * Selections are buffered: changes are only returned when the user hits Apply.
 * Resolves to the new ordered id array on Apply, or null when cancelled.
 *
 * Ordering rule: ids that were already selected keep their original order,
 * newly checked ids are appended in the order they appear in `items`.
 * Reordering is handled outside this dialog, not here.
 */
export function showMembershipPicker(options: MembershipPickerOptions): Promise<number[] | null> {
  return new Promise((resolve) => {
    const noun = options.itemNoun ?? "items";
    const max = options.maxSelection;

    // Buffered selection state (cancel discards, apply commits).
    const draft = new Set<number>(options.selectedIds);

    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";

    const dialog = document.createElement("div");
    dialog.className = "dialog-card picker-card";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "picker-title");

    dialog.innerHTML = `
      <h2 id="picker-title" class="dialog-title">${escapeHtml(options.title)}</h2>
      <div class="picker-toolbar">
        <input class="picker-search" type="search" placeholder="${escapeHtml(options.searchPlaceholder ?? "Search")}" aria-label="Filter ${escapeHtml(noun)}" />
        <span class="picker-counter" aria-live="polite"></span>
      </div>
      <div class="picker-list" role="group" aria-label="Available ${escapeHtml(noun)}"></div>
      <p class="picker-empty muted-text" hidden>${escapeHtml(options.emptyMessage ?? `No ${noun} available.`)}</p>
      <div class="dialog-actions">
        <button class="button ghost picker-cancel">${escapeHtml(options.cancelLabel ?? "Cancel")}</button>
        <button class="button picker-apply">${escapeHtml(options.confirmLabel ?? "Apply")}</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const searchInput = dialog.querySelector<HTMLInputElement>(".picker-search");
    const listEl = dialog.querySelector<HTMLElement>(".picker-list");
    const emptyEl = dialog.querySelector<HTMLElement>(".picker-empty");
    const counterEl = dialog.querySelector<HTMLElement>(".picker-counter");
    const cancelBtn = dialog.querySelector<HTMLButtonElement>(".picker-cancel");
    const applyBtn = dialog.querySelector<HTMLButtonElement>(".picker-apply");

    const updateCounter = (): void => {
      if (counterEl) {
        counterEl.textContent = `${draft.size}/${max} ${noun} selected`;
        counterEl.classList.toggle("picker-counter-full", draft.size >= max);
      }
    };

    // Disable unchecked rows once the limit is reached.
    const refreshLimitState = (): void => {
      const atLimit = draft.size >= max;
      for (const input of listEl?.querySelectorAll<HTMLInputElement>("input[type=checkbox]") ?? []) {
        if (!input.checked) {
          input.disabled = atLimit;
        }
      }
    };

    const renderList = (): void => {
      if (!listEl) {
        return;
      }
      const query = (searchInput?.value ?? "").trim().toLowerCase();
      const visible = options.items.filter((item) => item.label.toLowerCase().includes(query));

      if (options.items.length === 0) {
        listEl.innerHTML = "";
        if (emptyEl) {
          emptyEl.hidden = false;
        }
      } else {
        if (emptyEl) {
          emptyEl.hidden = true;
        }
        listEl.innerHTML = visible.length === 0
          ? `<p class="muted-text picker-no-match">No ${escapeHtml(noun)} match "${escapeHtml(query)}".</p>`
          : visible
              .map(
                (item) => `
                  <label class="picker-row">
                    <input type="checkbox" data-picker-id="${item.id}" ${draft.has(item.id) ? "checked" : ""} />
                    <span>${escapeHtml(item.label)}</span>
                  </label>
                `,
              )
              .join("");
      }

      for (const input of listEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
        input.addEventListener("change", () => {
          const id = Number.parseInt(input.dataset.pickerId ?? "", 10);
          if (Number.isNaN(id)) {
            return;
          }
          if (input.checked) {
            if (draft.size >= max) {
              input.checked = false;
              return;
            }
            draft.add(id);
          } else {
            draft.delete(id);
          }
          updateCounter();
          refreshLimitState();
        });
      }

      updateCounter();
      refreshLimitState();
    };

    const cleanup = (result: number[] | null): void => {
      backdrop.classList.add("dialog-backdrop-hiding");
      dialog.classList.add("dialog-card-hiding");
      backdrop.addEventListener("transitionend", () => backdrop.remove(), { once: true });
      setTimeout(() => backdrop.remove(), 300);
      document.removeEventListener("keydown", handleKeydown);
      resolve(result);
    };

    const commit = (): void => {
      // Preserve prior order for kept ids, append new ids in list order.
      const kept = options.selectedIds.filter((id) => draft.has(id));
      const keptSet = new Set(kept);
      const added = options.items.map((item) => item.id).filter((id) => draft.has(id) && !keptSet.has(id));
      cleanup([...kept, ...added]);
    };

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        cleanup(null);
      }
    };

    searchInput?.addEventListener("input", renderList);
    cancelBtn?.addEventListener("click", () => cleanup(null));
    applyBtn?.addEventListener("click", commit);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        cleanup(null);
      }
    });
    document.addEventListener("keydown", handleKeydown);

    renderList();

    requestAnimationFrame(() => {
      backdrop.classList.add("dialog-backdrop-visible");
      dialog.classList.add("dialog-card-visible");
      searchInput?.focus();
    });
  });
}

// ============================================================================
// Utility
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
