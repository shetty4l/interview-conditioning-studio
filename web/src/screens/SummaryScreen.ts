/**
 * Summary Screen
 *
 * Session summary with stats, code, and invariants display.
 */

import type { Screen, ScreenContext, AppState } from "./types";
import { Phase } from "../../../core/src/index";
import { ACTIONS, COMPONENTS } from "../constants";
import * as PhaseHeader from "../components/PhaseHeader";
import * as Button from "../components/Button";
import { formatTime } from "../components/Timer";

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(state: AppState): string {
  const { sessionState, problem } = state;
  if (!sessionState || !problem) {
    return `<div class="summary-screen">Loading...</div>`;
  }

  const totalNudges = sessionState.nudgesRemaining + sessionState.nudgesUsed;

  return `
    <div class="summary-screen" data-component="${COMPONENTS.SCREEN_SUMMARY}">
      ${PhaseHeader.render({ phase: Phase.Summary })}

      <h2>Session Complete</h2>

      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">Prep Time Used</span>
          <span class="stat-value">${sessionState.prepTimeUsed ? formatTime(sessionState.prepTimeUsed) : "N/A"}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Nudges Used</span>
          <span class="stat-value">${sessionState.nudgesUsed} / ${totalNudges}</span>
        </div>
      </div>

      <div class="summary-section">
        <h3>Problem</h3>
        <p>${escapeHtml(problem.title)}</p>
      </div>

      <div class="summary-section">
        <h3>Your Invariants</h3>
        <pre class="summary-content">${escapeHtml(sessionState.invariants || "(none)")}</pre>
      </div>

      <div class="summary-section">
        <h3>Your Code</h3>
        <pre class="summary-content code">${escapeHtml(sessionState.code || "(none)")}</pre>
      </div>

      ${Button.render({
        label: "Continue to Reflection",
        variant: "primary",
        size: "large",
        action: ACTIONS.CONTINUE_TO_REFLECTION,
        className: "continue-button",
      })}
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_SUMMARY}"]`);
  if (!container) return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Continue to reflection
    const continueBtn = target.closest(`[data-action="${ACTIONS.CONTINUE_TO_REFLECTION}"]`);
    if (continueBtn) {
      ctx.dispatch({ type: "CONTINUE_TO_REFLECTION" });
      return;
    }
  };

  container.addEventListener("click", handleClick);

  cleanup = () => {
    container.removeEventListener("click", handleClick);
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
}

// ============================================================================
// Update (no-op - summary is static)
// ============================================================================

export function update(_state: AppState): boolean {
  // Return true to prevent unnecessary re-renders
  return true;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
