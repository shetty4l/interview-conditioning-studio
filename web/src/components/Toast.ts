/**
 * Toast Component
 *
 * Toast notification system with neobrutalism styling.
 */

import { div, signal, For } from "../framework";

// ============================================================================
// Types
// ============================================================================

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// ============================================================================
// Toast Manager (module-level state)
// ============================================================================

let toastId = 0;
const [toasts, setToasts] = signal<ToastMessage[]>([]);

export function showToast(message: string, type: ToastType = "info"): void {
  const id = ++toastId;
  setToasts([...toasts(), { id, message, type }]);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    dismissToast(id);
  }, 3000);
}

export function dismissToast(id: number): void {
  setToasts(toasts().filter((t) => t.id !== id));
}

// ============================================================================
// Toast Item Component
// ============================================================================

function ToastItem(toast: ToastMessage): HTMLElement {
  return div(
    {
      class: `toast toast--${toast.type}`,
      onClick: () => dismissToast(toast.id),
      style: "cursor: pointer;",
    },
    [toast.message],
  );
}

// ============================================================================
// Toast Container Component
// ============================================================================

export function ToastContainer(): HTMLElement {
  return div(
    {
      id: "toast-container",
    },
    [For(toasts, (toast) => ToastItem(toast))],
  );
}
