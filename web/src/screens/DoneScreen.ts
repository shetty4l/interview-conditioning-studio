/**
 * Done Screen
 *
 * Session completion with export and new session options.
 * Centered layout with inline badge (no PhaseHeader).
 */

import type { ScreenContext, AppState } from "./types";
import { ACTIONS, COMPONENTS } from "../constants";
import * as Button from "../components/Button";

// ============================================================================
// Styles (co-located)
// ============================================================================

export const styles = `
/* === DoneScreen === */
.done-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: var(--space-xl);
}

.done-screen__badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-lg);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: var(--color-done);
  color: white;
  margin-bottom: var(--space-xl);
}

.done-screen__title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 var(--space-sm) 0;
}

.done-screen__subtitle {
  color: var(--color-text-muted);
  margin: 0 0 var(--space-xl) 0;
}

.done-screen__actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  justify-content: center;
}
`;

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(_state: AppState): string {
  return `
    <div class="done-screen" data-component="${COMPONENTS.SCREEN_DONE}">
      <span class="done-screen__badge">Done</span>
      <h2 class="done-screen__title">Session Complete!</h2>
      <p class="done-screen__subtitle">Great job completing your practice session.</p>

      <div class="done-screen__actions">
        ${Button.render({
          label: "Export Session",
          variant: "primary",
          size: "large",
          action: ACTIONS.EXPORT_SESSION,
        })}

        ${Button.render({
          label: "Start New Session",
          variant: "secondary",
          action: ACTIONS.NEW_SESSION,
        })}
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
