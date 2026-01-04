/**
 * Timer Component
 *
 * Displays time in MM:SS format with warning and overtime states.
 */

import { span } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface TimerProps {
  remainingMs: number | (() => number);
  id?: string;
}

// ============================================================================
// Utilities
// ============================================================================

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const sign = ms < 0 ? "-" : "";
  return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getTimerState(ms: number): "normal" | "warning" | "overtime" {
  if (ms < 0) return "overtime";
  if (ms <= 60000) return "warning";
  return "normal";
}

// ============================================================================
// Component
// ============================================================================

export function Timer(props: TimerProps): HTMLSpanElement {
  const { remainingMs, id } = props;

  const getMs = typeof remainingMs === "function" ? remainingMs : () => remainingMs;

  return span(
    {
      id,
      class: () => {
        const ms = getMs();
        const state = getTimerState(ms);
        return state === "normal" ? "timer" : `timer timer--${state}`;
      },
      "data-component": "timer",
    },
    [() => formatTime(getMs())],
  );
}
