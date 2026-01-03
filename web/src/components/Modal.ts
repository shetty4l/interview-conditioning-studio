/**
 * Modal Component
 *
 * Base modal container with backdrop, close button, and content area.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface ModalProps {
  /** Modal ID for targeting */
  id?: string;
  /** Modal title */
  title: string;
  /** Modal content (HTML string) */
  content: string;
  /** Footer content - typically buttons (HTML string) */
  footer?: string;
  /** Whether to show close button */
  showClose?: boolean;
  /** Size variant */
  size?: "small" | "medium" | "large";
}

export interface ModalHandlers {
  onClose: () => void;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === Modal === */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modal-fade-in 0.15s ease-out;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-slide-in 0.15s ease-out;
}

@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal--small {
  width: min(400px, 90vw);
}

.modal--medium {
  width: min(500px, 90vw);
}

.modal--large {
  width: min(700px, 90vw);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.modal__close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--space-xs);
  font-size: 1.25rem;
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.modal__close:hover {
  color: var(--color-text);
  background-color: var(--color-surface-hover);
}

.modal__body {
  padding: var(--space-lg);
  overflow-y: auto;
}

.modal__footer {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: ModalProps): string {
  const { id, title, content, footer, showClose = true, size = "medium" } = props;

  const idAttr = id ? ` id="${id}"` : "";
  const closeButton = showClose
    ? `<button class="modal__close" data-modal-close aria-label="Close">&times;</button>`
    : "";

  const footerHtml = footer ? `<div class="modal__footer">${footer}</div>` : "";

  return `
    <div class="modal-backdrop" data-component="${COMPONENTS.MODAL_CONTAINER}" data-modal-backdrop${idAttr}>
      <div class="modal modal--${size}" role="dialog" aria-labelledby="modal-title">
        <div class="modal__header">
          <h2 class="modal__title" id="modal-title">${escapeHtml(title)}</h2>
          ${closeButton}
        </div>
        <div class="modal__body">
          ${content}
        </div>
        ${footerHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(element: HTMLElement, handlers: ModalHandlers): () => void {
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Close on backdrop click
    if (target.hasAttribute("data-modal-backdrop")) {
      handlers.onClose();
      return;
    }

    // Close on close button click
    if (target.closest("[data-modal-close]")) {
      handlers.onClose();
      return;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handlers.onClose();
    }
  };

  element.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);

  // Focus trap - focus first focusable element
  const focusable = element.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus();

  return () => {
    element.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleKeydown);
  };
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
