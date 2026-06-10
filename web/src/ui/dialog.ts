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
// Utility
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
