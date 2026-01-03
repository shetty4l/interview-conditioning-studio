/**
 * Toast Component
 *
 * Displays temporary notification messages with auto-dismiss.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export type ToastType = "info" | "error" | "success";

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
}

export interface ToastHandlers {
  onDismiss: (id: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === Toast === */
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: toast-slide-in 0.2s ease-out;
  max-width: 400px;
}

.toast--info {
  border-left: 3px solid var(--color-primary);
}

.toast--error {
  border-left: 3px solid var(--color-danger);
}

.toast--success {
  border-left: 3px solid var(--color-success);
}

.toast__message {
  flex: 1;
}

.toast__dismiss {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--space-xs);
  font-size: 1rem;
  line-height: 1;
}

.toast__dismiss:hover {
  color: var(--color-text);
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast--exiting {
  animation: toast-slide-out 0.2s ease-in forwards;
}

@keyframes toast-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: ToastProps): string {
  const { id, message, type = "info" } = props;

  return `
    <div 
      class="toast toast--${type}" 
      data-component="${COMPONENTS.TOAST_CONTAINER}"
      data-toast-id="${id}"
    >
      <span class="toast__message">${escapeHtml(message)}</span>
      <button class="toast__dismiss" data-dismiss="${id}" aria-label="Dismiss">&times;</button>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(element: HTMLElement, handlers: ToastHandlers): () => void {
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const dismissId = target.closest("[data-dismiss]")?.getAttribute("data-dismiss");
    if (dismissId) {
      handlers.onDismiss(dismissId);
    }
  };

  element.addEventListener("click", handleClick);

  return () => {
    element.removeEventListener("click", handleClick);
  };
}

// ============================================================================
// Toast Manager
// ============================================================================

const DEFAULT_DURATION = 4000;

interface ToastState {
  props: ToastProps;
  timeoutId: ReturnType<typeof setTimeout>;
}

const toasts = new Map<string, ToastState>();
let toastCounter = 0;

/**
 * Show a toast notification.
 * @returns The toast ID for manual dismissal if needed.
 */
export function show(
  message: string,
  type: ToastType = "info",
  duration = DEFAULT_DURATION,
): string {
  const id = `toast-${++toastCounter}`;
  const container = getOrCreateContainer();

  const props: ToastProps = { id, message, type };
  const html = render(props);

  // Add to DOM
  container.insertAdjacentHTML("beforeend", html);

  // Set up auto-dismiss
  const timeoutId = setTimeout(() => dismiss(id), duration);
  toasts.set(id, { props, timeoutId });

  return id;
}

/**
 * Dismiss a toast by ID.
 */
export function dismiss(id: string): void {
  const state = toasts.get(id);
  if (!state) return;

  clearTimeout(state.timeoutId);
  toasts.delete(id);

  const element = document.querySelector(`[data-toast-id="${id}"]`);
  if (element) {
    element.classList.add("toast--exiting");
    element.addEventListener("animationend", () => element.remove(), { once: true });
  }
}

/**
 * Get or create the toast container element.
 */
function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);

    // Mount event delegation for dismiss buttons
    mount(container, { onDismiss: dismiss });
  }
  return container;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
