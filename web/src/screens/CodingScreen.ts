/**
 * Coding Screen
 *
 * Code editor with nudge button. Handles both CODING and SILENT phases.
 */

import type { ScreenContext, AppState } from "./types";
import { Phase } from "../../../core/src/index";
import { ACTIONS, COMPONENTS } from "../constants";
import * as PhaseHeader from "../components/PhaseHeader";
import * as CodeEditor from "../components/CodeEditor";
import * as NudgeButton from "../components/NudgeButton";
import * as InvariantsDisplay from "../components/InvariantsDisplay";
import * as Button from "../components/Button";

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;
let _currentCtx: ScreenContext | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(state: AppState): string {
  const { sessionState, problem, screen } = state;
  if (!sessionState || !problem) {
    return `<div class="coding-screen">Loading...</div>`;
  }

  const isSilent = screen === "silent";
  const phase = isSilent ? Phase.Silent : Phase.Coding;

  // Build action buttons for header
  let headerActions = "";
  if (!isSilent) {
    headerActions = NudgeButton.render({
      remaining: sessionState.nudgesRemaining,
      total: sessionState.nudgesRemaining + sessionState.nudgesUsed,
    });
  }

  // Add submit solution button
  headerActions += Button.render({
    label: "Submit Solution",
    variant: "secondary",
    action: ACTIONS.SUBMIT_SOLUTION,
  });

  const silentBanner = isSilent
    ? `<div class="silent-banner">Silent Phase - No assistance available</div>`
    : "";

  const silentClass = isSilent ? " coding-screen--silent" : "";

  return `
    <div class="coding-screen${silentClass}" data-component="${COMPONENTS.SCREEN_CODING}">
      ${PhaseHeader.render({
        phase,
        remainingMs: sessionState.remainingTime,
        actions: headerActions,
      })}

      ${silentBanner}

      <div class="problem-summary">
        <strong>${escapeHtml(problem.title)}</strong>
        ${sessionState.invariants ? InvariantsDisplay.render({ value: sessionState.invariants }) : ""}
      </div>

      <div class="code-section">
        ${CodeEditor.render({
          value: sessionState.code,
          id: "code",
        })}
      </div>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  _currentCtx = ctx;
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_CODING}"]`);
  if (!container) return;

  // Mount code editor
  const codeEditorEl = container.querySelector(`[data-component="${COMPONENTS.CODE_EDITOR}"]`);
  let codeEditorCleanup: (() => void) | null = null;
  if (codeEditorEl) {
    codeEditorCleanup = CodeEditor.mount(codeEditorEl as HTMLElement, {
      onChange: (value) => ctx.dispatch({ type: "UPDATE_CODE", code: value }),
    });
  }

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Request nudge
    const nudgeBtn = target.closest(`[data-action="${ACTIONS.REQUEST_NUDGE}"]`);
    if (nudgeBtn && !nudgeBtn.hasAttribute("disabled")) {
      ctx.dispatch({ type: "REQUEST_NUDGE" });
      return;
    }

    // Submit solution
    const submitBtn = target.closest(`[data-action="${ACTIONS.SUBMIT_SOLUTION}"]`);
    if (submitBtn) {
      ctx.dispatch({ type: "SUBMIT_SOLUTION" });
      return;
    }
  };

  container.addEventListener("click", handleClick);

  cleanup = () => {
    container.removeEventListener("click", handleClick);
    codeEditorCleanup?.();
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
  _currentCtx = null;
}

// ============================================================================
// Update (targeted)
// ============================================================================

export function update(state: AppState): boolean {
  const { sessionState } = state;
  if (!sessionState) return false;

  let handled = false;

  // Update timer
  const headerEl = document.querySelector(`[data-component="${COMPONENTS.PHASE_HEADER}"]`);
  if (headerEl) {
    PhaseHeader.updateTimer(headerEl as HTMLElement, sessionState.remainingTime);
    handled = true;
  }

  // Update nudge button
  const nudgeEl = document.querySelector(`[data-component="${COMPONENTS.NUDGE_BUTTON}"]`);
  if (nudgeEl) {
    NudgeButton.update(nudgeEl as HTMLElement, {
      remaining: sessionState.nudgesRemaining,
      total: sessionState.nudgesRemaining + sessionState.nudgesUsed,
    });
    handled = true;
  }

  return handled;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
