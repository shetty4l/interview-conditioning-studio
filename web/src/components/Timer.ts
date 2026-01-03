/**
 * Timer Component
 *
 * Displays time in MM:SS format with optional overtime styling.
 * Supports targeted updates without full re-render.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface TimerProps {
  /** Time remaining in milliseconds (negative = overtime) */
  remainingMs: number;
  /** Optional ID for targeted updates */
  id?: string;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === Timer === */
.timer {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.02em;
}

.timer--overtime {
  color: var(--color-danger);
}

.timer--warning {
  color: var(--color-warning);
}
`;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format milliseconds as MM:SS string.
 * Negative values show with a leading minus sign.
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const sign = ms < 0 ? "-" : "";
  return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Determine timer state based on remaining time.
 */
function getTimerState(ms: number): "normal" | "warning" | "overtime" {
  if (ms < 0) return "overtime";
  if (ms <= 60000) return "warning"; // Last minute
  return "normal";
}

// ============================================================================
// Render
// ============================================================================

export function render(props: TimerProps): string {
  const { remainingMs, id } = props;
  const state = getTimerState(remainingMs);
  const timeStr = formatTime(remainingMs);

  const modifierClass = state !== "normal" ? ` timer--${state}` : "";
  const idAttr = id ? ` id="${id}"` : "";

  return `
    <span 
      class="timer${modifierClass}" 
      data-component="${COMPONENTS.TIMER}"${idAttr}
    >${timeStr}</span>
  `;
}

// ============================================================================
// Update (targeted DOM update)
// ============================================================================

/**
 * Update timer display without full re-render.
 * Call this on each tick for efficient updates.
 */
export function update(element: HTMLElement, props: TimerProps): void {
  const { remainingMs } = props;
  const state = getTimerState(remainingMs);
  const timeStr = formatTime(remainingMs);

  // Update text content
  element.textContent = timeStr;

  // Update modifier classes
  element.classList.remove("timer--warning", "timer--overtime");
  if (state !== "normal") {
    element.classList.add(`timer--${state}`);
  }
}
