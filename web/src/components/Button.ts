/**
 * Button Component
 *
 * Neobrutalism-styled button with variants.
 */

import { button } from "../framework";

// ============================================================================
// Types
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "small" | "normal" | "large";

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean | (() => boolean);
  action?: string;
  className?: string;
  type?: "button" | "submit";
  onClick?: (e: MouseEvent) => void;
}

// ============================================================================
// Component
// ============================================================================

export function Button(props: ButtonProps): HTMLButtonElement {
  const {
    label,
    variant = "primary",
    size = "normal",
    disabled = false,
    action,
    className = "",
    type = "button",
    onClick,
  } = props;

  const sizeClass = size === "large" ? "btn--large" : size === "small" ? "btn--small" : "";

  const classes = ["btn", `btn--${variant}`, sizeClass, className].filter(Boolean).join(" ");

  return button(
    {
      type,
      class: classes,
      "data-action": action,
      disabled,
      onClick,
    },
    [label],
  );
}
