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
  isPaused?: boolean | (() => boolean);
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
  const { phase, remainingMs, isPaused, actions = [] } = props;

  const getPhase = typeof phase === "function" ? phase : () => phase;
  const getIsPaused = typeof isPaused === "function" ? isPaused : () => isPaused ?? false;

  return div(
    {
      class: () => {
        const classes = ["phase-header"];
        if (getIsPaused()) classes.push("phase-header--paused");
        return classes.join(" ");
      },
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
      Timer({ remainingMs, isPaused }),
      ...(actions.length > 0 ? [div({ class: "phase-header__actions" }, actions)] : []),
    ],
  );
}
