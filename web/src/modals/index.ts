/**
 * Modal Manager
 *
 * Manages modal lifecycle: showing, hiding, and stacking.
 */

import * as Modal from "../components/Modal";

// ============================================================================
// Types
// ============================================================================

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ResumeModalOptions {
  sessionId: string;
  problemTitle: string;
  phase: string;
  onResume: () => void;
  onDiscard: () => void;
}

// ============================================================================
// State
// ============================================================================

let modalContainer: HTMLElement | null = null;
let currentCleanup: (() => void) | null = null;

// ============================================================================
// Modal Container
// ============================================================================

function getOrCreateContainer(): HTMLElement {
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "modal-root";
    document.body.appendChild(modalContainer);
  }
  return modalContainer;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Show a modal with custom content.
 */
export function show(props: Modal.ModalProps, onClose?: () => void): void {
  const container = getOrCreateContainer();

  // Close any existing modal
  hide();

  // Render modal
  container.innerHTML = Modal.render(props);

  // Mount event handlers
  const backdrop = container.firstElementChild as HTMLElement;
  if (backdrop) {
    currentCleanup = Modal.mount(backdrop, {
      onClose: () => {
        hide();
        onClose?.();
      },
    });
  }

  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

/**
 * Hide the current modal.
 */
export function hide(): void {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const container = getOrCreateContainer();
  container.innerHTML = "";

  // Restore body scroll
  document.body.style.overflow = "";
}

/**
 * Check if a modal is currently open.
 */
export function isOpen(): boolean {
  const container = getOrCreateContainer();
  return container.innerHTML !== "";
}

// ============================================================================
// Confirm Modal
// ============================================================================

/**
 * Show a confirmation modal.
 */
export function confirm(options: ConfirmModalOptions): void {
  const {
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "primary",
    onConfirm,
    onCancel,
  } = options;

  const content = `<p>${escapeHtml(message)}</p>`;

  const footer = `
    <button class="btn btn--secondary" data-action="modal-cancel">${escapeHtml(cancelText)}</button>
    <button class="btn btn--${confirmVariant}" data-action="modal-confirm">${escapeHtml(confirmText)}</button>
  `;

  show(
    {
      title,
      content,
      footer,
      size: "small",
    },
    onCancel,
  );

  // Add confirm/cancel handlers
  const container = getOrCreateContainer();

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    if (target.closest('[data-action="modal-confirm"]')) {
      hide();
      onConfirm();
      return;
    }

    if (target.closest('[data-action="modal-cancel"]')) {
      hide();
      onCancel?.();
      return;
    }
  };

  container.addEventListener("click", handleClick);

  // Store cleanup to remove this handler
  const originalCleanup = currentCleanup;
  currentCleanup = () => {
    originalCleanup?.();
    container.removeEventListener("click", handleClick);
  };
}

// ============================================================================
// Resume Modal
// ============================================================================

/**
 * Show a resume session modal.
 */
export function showResume(options: ResumeModalOptions): void {
  const { sessionId, problemTitle, phase, onResume, onDiscard } = options;

  const content = `
    <p>You have an incomplete session:</p>
    <div class="resume-modal__details">
      <p><strong>Problem:</strong> ${escapeHtml(problemTitle)}</p>
      <p><strong>Phase:</strong> ${escapeHtml(phase)}</p>
      <p><strong>Session:</strong> <code>${escapeHtml(sessionId)}</code></p>
    </div>
    <p>Would you like to resume or start fresh?</p>
  `;

  const footer = `
    <button class="btn btn--danger" data-action="modal-discard">Discard & Start New</button>
    <button class="btn btn--primary" data-action="modal-resume">Resume Session</button>
  `;

  show({
    title: "Resume Previous Session?",
    content,
    footer,
    size: "medium",
    showClose: false,
  });

  // Add resume/discard handlers
  const container = getOrCreateContainer();

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    if (target.closest('[data-action="modal-resume"]')) {
      hide();
      onResume();
      return;
    }

    if (target.closest('[data-action="modal-discard"]')) {
      hide();
      onDiscard();
      return;
    }
  };

  container.addEventListener("click", handleClick);

  // Store cleanup
  const originalCleanup = currentCleanup;
  currentCleanup = () => {
    originalCleanup?.();
    container.removeEventListener("click", handleClick);
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

// ============================================================================
// Styles for modal-specific content
// ============================================================================

export const styles = `
/* === Resume Modal Details === */
.resume-modal__details {
  background-color: var(--color-bg);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin: var(--space-md) 0;
}

.resume-modal__details p {
  margin: var(--space-xs) 0;
}

.resume-modal__details code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  color: var(--color-text-muted);
}
`;
