/**
 * PhaseHeader Component
 *
 * Header bar showing current phase badge, timer, and action buttons.
 */

import { COMPONENTS } from "../constants";
import * as Timer from "./Timer";
import { Phase } from "../../../core/src/index";

// ============================================================================
// Types
// ============================================================================

export interface PhaseHeaderProps {
  /** Current phase */
  phase: Phase;
  /** Time remaining in ms (optional - not all phases have timers) */
  remainingMs?: number;
  /** Additional content to render on the right side */
  actions?: string;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === PhaseHeader === */
.phase-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.phase-header__badge {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.phase-header__badge--prep {
  background-color: var(--color-prep);
  color: white;
}

.phase-header__badge--coding {
  background-color: var(--color-coding);
  color: white;
}

.phase-header__badge--silent {
  background-color: var(--color-silent);
  color: black;
}

.phase-header__badge--summary {
  background-color: var(--color-summary);
  color: white;
}

.phase-header__badge--reflection {
  background-color: var(--color-reflection);
  color: white;
}

.phase-header__badge--done {
  background-color: var(--color-done);
  color: white;
}

.phase-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
`;

// ============================================================================
// Render
// ============================================================================

const PHASE_LABELS: Record<Phase, string> = {
  [Phase.Start]: "START",
  [Phase.Prep]: "PREP",
  [Phase.Coding]: "CODING",
  [Phase.Silent]: "SILENT",
  [Phase.Summary]: "SUMMARY",
  [Phase.Reflection]: "REFLECTION",
  [Phase.Done]: "DONE",
};

export function render(props: PhaseHeaderProps): string {
  const { phase, remainingMs, actions = "" } = props;

  const phaseLabel = PHASE_LABELS[phase] || phase;
  const phaseClass = phase.toLowerCase();

  const timerHtml =
    remainingMs !== undefined ? Timer.render({ remainingMs, id: "phase-timer" }) : "";

  return `
    <div class="phase-header" data-component="${COMPONENTS.PHASE_HEADER}">
      <span class="phase-header__badge phase-header__badge--${phaseClass}" data-component="${COMPONENTS.PHASE_BADGE}">
        ${phaseLabel}
      </span>
      ${timerHtml}
      ${actions ? `<div class="phase-header__actions">${actions}</div>` : ""}
    </div>
  `;
}

// ============================================================================
// Update
// ============================================================================

/**
 * Update just the timer portion of the phase header.
 */
export function updateTimer(element: HTMLElement, remainingMs: number): void {
  const timerEl = element.querySelector(`[data-component="${COMPONENTS.TIMER}"]`);
  if (timerEl) {
    Timer.update(timerEl as HTMLElement, { remainingMs });
  }
}
