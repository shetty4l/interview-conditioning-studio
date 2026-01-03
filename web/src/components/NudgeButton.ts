/**
 * NudgeButton Component
 *
 * Button for requesting a nudge/hint during coding phase.
 * Shows remaining count and disables when exhausted.
 */

import { COMPONENTS, ACTIONS } from "../constants";
import * as Button from "./Button";

// ============================================================================
// Types
// ============================================================================

export interface NudgeButtonProps {
  /** Number of nudges remaining */
  remaining: number;
  /** Total nudges allowed */
  total: number;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === NudgeButton === */
.nudge-button {
  position: relative;
}

.nudge-button__count {
  font-family: var(--font-mono);
  font-size: 0.875em;
  opacity: 0.8;
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: NudgeButtonProps): string {
  const { remaining, total } = props;
  const disabled = remaining <= 0;

  return `
    <span class="nudge-button" data-component="${COMPONENTS.NUDGE_BUTTON}">
      ${Button.render({
        label: `Nudge (${remaining}/${total})`,
        variant: "secondary",
        disabled,
        action: ACTIONS.REQUEST_NUDGE,
      })}
    </span>
  `;
}

// ============================================================================
// Update
// ============================================================================

export function update(element: HTMLElement, props: NudgeButtonProps): void {
  const { remaining, total } = props;
  const button = element.querySelector("button");
  if (!button) return;

  button.textContent = `Nudge (${remaining}/${total})`;
  button.disabled = remaining <= 0;
}
