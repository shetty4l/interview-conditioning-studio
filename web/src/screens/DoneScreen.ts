/**
 * Done Screen
 *
 * Session completion with export and new session options.
 */

import type { Screen, ScreenContext, AppState } from "./types";
import { Phase } from "../../../core/src/index";
import { ACTIONS, COMPONENTS } from "../constants";
import * as PhaseHeader from "../components/PhaseHeader";
import * as Button from "../components/Button";

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(state: AppState): string {
  return `
    <div class="done-screen" data-component="${COMPONENTS.SCREEN_DONE}">
      ${PhaseHeader.render({ phase: Phase.Done })}

      <div class="done-content">
        <h2>Session Complete!</h2>
        <p>Great job completing your practice session.</p>

        <div class="done-actions">
          ${Button.render({
            label: "Export Session",
            variant: "secondary",
            action: ACTIONS.EXPORT_SESSION,
          })}

          ${Button.render({
            label: "Start New Session",
            variant: "primary",
            size: "large",
            action: ACTIONS.NEW_SESSION,
            className: "new-session-button",
          })}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_DONE}"]`);
  if (!container) return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Export session
    const exportBtn = target.closest(`[data-action="${ACTIONS.EXPORT_SESSION}"]`);
    if (exportBtn) {
      ctx.dispatch({ type: "EXPORT_SESSION" });
      return;
    }

    // New session
    const newBtn = target.closest(`[data-action="${ACTIONS.NEW_SESSION}"]`);
    if (newBtn) {
      ctx.dispatch({ type: "NEW_SESSION" });
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
// Update (no-op - done screen is static)
// ============================================================================

export function update(_state: AppState): boolean {
  // Return true to prevent unnecessary re-renders
  return true;
}
