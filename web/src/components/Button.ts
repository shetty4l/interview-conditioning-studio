/**
 * Button Component
 *
 * Reusable button with variants: primary, secondary, danger.
 */

import { type Action } from "../constants";

// ============================================================================
// Types
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "normal" | "large";

export interface ButtonProps {
  /** Button text */
  label: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Whether button is disabled */
  disabled?: boolean;
  /** data-action attribute for event delegation */
  action?: Action;
  /** Additional CSS classes */
  className?: string;
  /** Button type attribute */
  type?: "button" | "submit";
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === Button === */
.btn {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background-color: var(--color-primary);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
}

.btn--secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
}

.btn--danger {
  background-color: var(--color-danger);
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn--large {
  padding: var(--space-md) var(--space-xl);
  font-size: 1.125rem;
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: ButtonProps): string {
  const {
    label,
    variant = "primary",
    size = "normal",
    disabled = false,
    action,
    className = "",
    type = "button",
  } = props;

  const classes = ["btn", `btn--${variant}`, size === "large" ? "btn--large" : "", className]
    .filter(Boolean)
    .join(" ");

  const actionAttr = action ? ` data-action="${action}"` : "";
  const disabledAttr = disabled ? " disabled" : "";

  return `<button type="${type}" class="${classes}"${actionAttr}${disabledAttr}>${escapeHtml(label)}</button>`;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
