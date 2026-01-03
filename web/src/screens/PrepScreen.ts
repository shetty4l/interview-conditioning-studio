/**
 * Prep Screen
 *
 * Problem display and invariants input.
 */

import type { Screen, ScreenContext, AppState } from "./types";
import { Phase } from "../../../core/src/index";
import { ACTIONS, COMPONENTS } from "../constants";
import * as PhaseHeader from "../components/PhaseHeader";
import * as ProblemCard from "../components/ProblemCard";
import * as InvariantsInput from "../components/InvariantsInput";
import * as Button from "../components/Button";

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;
let currentCtx: ScreenContext | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(state: AppState): string {
  const { sessionState, problem } = state;
  if (!sessionState || !problem) {
    return `<div class="prep-screen">Loading...</div>`;
  }

  return `
    <div class="prep-screen" data-component="${COMPONENTS.SCREEN_PREP}">
      ${PhaseHeader.render({
        phase: Phase.Prep,
        remainingMs: sessionState.remainingTime,
      })}

      ${ProblemCard.render({
        title: problem.title,
        description: problem.description,
      })}

      <div class="invariants-section">
        <label for="invariants">
          <h3>Invariants & Notes</h3>
          <p class="hint">Write down your approach, edge cases, and any assumptions</p>
        </label>
        ${InvariantsInput.render({
          value: sessionState.invariants,
          id: "invariants",
        })}
      </div>

      ${Button.render({
        label: "Start Coding",
        variant: "primary",
        size: "large",
        action: ACTIONS.START_CODING,
        className: "start-coding-button",
      })}
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  currentCtx = ctx;
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_PREP}"]`);
  if (!container) return;

  // Mount invariants input
  const invariantsEl = container.querySelector(`[data-component="${COMPONENTS.INVARIANTS_INPUT}"]`);
  let invariantsCleanup: (() => void) | null = null;
  if (invariantsEl) {
    invariantsCleanup = InvariantsInput.mount(invariantsEl as HTMLElement, {
      onChange: (value) => ctx.dispatch({ type: "UPDATE_INVARIANTS", invariants: value }),
    });
  }

  // Mount problem card (for toggle)
  const problemCardEl = container.querySelector(`[data-component="${COMPONENTS.PROBLEM_CARD}"]`);
  let problemCardCleanup: (() => void) | null = null;
  if (problemCardEl) {
    problemCardCleanup = ProblemCard.mount(problemCardEl as HTMLElement);
  }

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Start coding
    const startBtn = target.closest(`[data-action="${ACTIONS.START_CODING}"]`);
    if (startBtn) {
      ctx.dispatch({ type: "START_CODING" });
      return;
    }
  };

  container.addEventListener("click", handleClick);

  cleanup = () => {
    container.removeEventListener("click", handleClick);
    invariantsCleanup?.();
    problemCardCleanup?.();
  };
}

// ============================================================================
// Unmount
// ============================================================================

export function unmount(): void {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  currentCtx = null;
}

// ============================================================================
// Update (targeted)
// ============================================================================

export function update(state: AppState): boolean {
  const { sessionState } = state;
  if (!sessionState) return false;

  // Update timer
  const headerEl = document.querySelector(`[data-component="${COMPONENTS.PHASE_HEADER}"]`);
  if (headerEl) {
    PhaseHeader.updateTimer(headerEl as HTMLElement, sessionState.remainingTime);
    return true;
  }

  return false;
}
