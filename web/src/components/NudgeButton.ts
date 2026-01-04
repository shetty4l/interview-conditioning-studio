/**
 * NudgeButton Component
 *
 * Button for requesting nudges with count display.
 */

import { button } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface NudgeButtonProps {
  nudgesUsed: number | (() => number);
  nudgesAllowed: number | (() => number);
  disabled?: boolean | (() => boolean);
  onClick: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function NudgeButton(props: NudgeButtonProps): HTMLButtonElement {
  const { nudgesUsed, nudgesAllowed, disabled = false, onClick } = props;

  const getUsed = typeof nudgesUsed === "function" ? nudgesUsed : () => nudgesUsed;
  const getAllowed = typeof nudgesAllowed === "function" ? nudgesAllowed : () => nudgesAllowed;
  const getDisabled = typeof disabled === "function" ? disabled : () => disabled;

  const isDisabled = () => getDisabled() || getUsed() >= getAllowed();

  return button(
    {
      class: "btn btn--secondary nudge-button",
      "data-action": "request-nudge",
      disabled: isDisabled,
      onClick,
    },
    [
      // Display remaining nudges (allowed - used) / total
      () => `Nudge (${getAllowed() - getUsed()}/${getAllowed()})`,
    ],
  );
}
