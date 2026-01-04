/**
 * PhaseHeader Component
 *
 * Displays phase badge, timer, and action buttons.
 */

import { div, span } from "../framework";
import { Timer } from "./Timer";
import type { Phase } from "../../../core/src/index";

// ============================================================================
// Types
// ============================================================================

export interface PhaseHeaderProps {
  phase: Phase | string | (() => Phase | string);
  remainingMs: number | (() => number);
  actions?: HTMLElement[];
}

// ============================================================================
// Utilities
// ============================================================================

function getPhaseName(phase: Phase | string): string {
  const names: Record<string, string> = {
    prep: "PREP",
    coding: "CODING",
    silent: "SILENT",
    summary: "SUMMARY",
    reflection: "REFLECTION",
    done: "DONE",
  };
  return names[phase.toLowerCase()] || phase.toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export function PhaseHeader(props: PhaseHeaderProps): HTMLElement {
  const { phase, remainingMs, actions = [] } = props;

  const getPhase = typeof phase === "function" ? phase : () => phase;

  return div(
    {
      class: "phase-header",
      "data-component": "phase-header",
    },
    [
      span(
        {
          class: () => {
            const phaseStr = String(getPhase()).toLowerCase();
            return `phase-header__badge phase-header__badge--${phaseStr}`;
          },
        },
        [() => getPhaseName(String(getPhase()))],
      ),
      Timer({ remainingMs }),
      ...(actions.length > 0 ? [div({ class: "phase-header__actions" }, actions)] : []),
    ],
  );
}
