/**
 * ConfirmButton Component
 *
 * Two-click confirmation pattern to replace modals.
 * First click shows "Confirm?" state, second click executes action.
 * Resets after 3s timeout or blur.
 */

import { button, onCleanup, signal } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface ConfirmButtonProps {
  label: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  action?: string;
  onConfirm: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ConfirmButton(props: ConfirmButtonProps): HTMLButtonElement {
  const {
    label,
    confirmLabel = "Confirm?",
    variant = "danger",
    action,
    onConfirm,
    className = "",
  } = props;

  const [confirming, setConfirming] = signal(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    setConfirming(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const handleClick = () => {
    if (confirming()) {
      // Second click - execute action
      reset();
      onConfirm();
    } else {
      // First click - enter confirming state
      setConfirming(true);
      // Auto-reset after 3 seconds
      timeoutId = setTimeout(reset, 3000);
    }
  };

  const handleBlur = () => {
    // Reset on blur (click elsewhere)
    if (confirming()) {
      reset();
    }
  };

  // Cleanup timeout on unmount
  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return button(
    {
      class: () => {
        const baseClasses = ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");
        return confirming() ? `${baseClasses} btn--confirming` : baseClasses;
      },
      "data-action": action,
      onClick: handleClick,
      onBlur: handleBlur,
    },
    [() => (confirming() ? confirmLabel : label)],
  );
}
