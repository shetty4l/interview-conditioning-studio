/**
 * PauseButton Component
 *
 * Toggle button for pausing/resuming the session timer.
 */

import { button } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface PauseButtonProps {
  isPaused: boolean | (() => boolean);
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean | (() => boolean);
}

// ============================================================================
// Component
// ============================================================================

export function PauseButton(props: PauseButtonProps): HTMLButtonElement {
  const { isPaused, onPause, onResume, disabled = false } = props;

  const getIsPaused = typeof isPaused === "function" ? isPaused : () => isPaused;
  const getDisabled = typeof disabled === "function" ? disabled : () => disabled;

  return button(
    {
      type: "button",
      class: () => {
        const paused = getIsPaused();
        return paused ? "btn btn--ghost pause-btn pause-btn--paused" : "btn btn--ghost pause-btn";
      },
      "data-component": "pause-button",
      "aria-label": () => (getIsPaused() ? "Resume session" : "Pause session"),
      disabled: getDisabled,
      onClick: () => {
        if (getIsPaused()) {
          onResume();
        } else {
          onPause();
        }
      },
    },
    [() => (getIsPaused() ? "Resume" : "Pause")],
  );
}
