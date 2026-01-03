/**
 * Home Screen
 *
 * Preset selection and session start.
 */

import type { ScreenContext, AppState } from "./types";
import { Preset } from "../../../core/src/index";
import { ACTIONS, COMPONENTS } from "../constants";
import * as PresetCard from "../components/PresetCard";
import * as Button from "../components/Button";

// ============================================================================
// Preset Definitions
// ============================================================================

const PRESETS = [
  {
    preset: Preset.Standard,
    label: "Standard",
    description: "5 min prep, 35 min coding, 3 nudges",
  },
  {
    preset: Preset.HighPressure,
    label: "High Pressure",
    description: "3 min prep, 25 min coding, 1 nudge",
  },
  {
    preset: Preset.NoAssistance,
    label: "No Assistance",
    description: "5 min prep, 35 min coding, 0 nudges",
  },
];

// ============================================================================
// Styles (co-located)
// ============================================================================

export const styles = `
/* === Resume Banner === */
.resume-banner {
  background-color: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.resume-banner__text {
  flex: 1;
  min-width: 200px;
}

.resume-banner__title {
  font-weight: 600;
  margin: 0 0 var(--space-xs) 0;
  color: var(--color-text);
}

.resume-banner__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.resume-banner__actions {
  display: flex;
  gap: var(--space-sm);
}
`;

// ============================================================================
// State
// ============================================================================

let cleanup: (() => void) | null = null;

// ============================================================================
// Render
// ============================================================================

export function render(state: AppState): string {
  const presetCards = PRESETS.map((p) =>
    PresetCard.render({
      preset: p.preset,
      label: p.label,
      description: p.description,
      selected: state.selectedPreset === p.preset,
    }),
  ).join("");

  // Resume banner if incomplete session exists
  const resumeBanner = state.incompleteSession
    ? `
      <div class="resume-banner" data-component="resume-banner">
        <div class="resume-banner__text">
          <p class="resume-banner__title">Continue Previous Session?</p>
          <p class="resume-banner__subtitle">
            ${escapeHtml(state.incompleteSession.problemTitle)} - ${escapeHtml(state.incompleteSession.phase)} phase
          </p>
        </div>
        <div class="resume-banner__actions">
          ${Button.render({
            label: "Discard",
            variant: "secondary",
            action: ACTIONS.DISCARD_SESSION,
          })}
          ${Button.render({
            label: "Resume",
            variant: "primary",
            action: ACTIONS.RESUME_SESSION,
          })}
        </div>
      </div>
    `
    : "";

  return `
    <div class="home-screen" data-component="${COMPONENTS.SCREEN_HOME}">
      <h1>Interview Conditioning Studio</h1>
      <p class="tagline">Practice technical interviews under realistic conditions</p>

      ${resumeBanner}

      <div class="preset-selector">
        <h2>Select Difficulty</h2>
        <div class="preset-cards">
          ${presetCards}
        </div>
      </div>

      ${Button.render({
        label: "Start Session",
        variant: "primary",
        size: "large",
        action: ACTIONS.START_SESSION,
        className: "start-button",
      })}
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_HOME}"]`);
  if (!container) return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Preset selection
    const presetCard = target.closest(`[data-action="${ACTIONS.SELECT_PRESET}"]`);
    if (presetCard) {
      const preset = presetCard.getAttribute("data-preset") as Preset;
      if (preset) {
        ctx.dispatch({ type: "SELECT_PRESET", preset });
      }
      return;
    }

    // Start session
    const startBtn = target.closest(`[data-action="${ACTIONS.START_SESSION}"]`);
    if (startBtn) {
      ctx.dispatch({ type: "START_SESSION" });
      return;
    }

    // Resume session
    const resumeBtn = target.closest(`[data-action="${ACTIONS.RESUME_SESSION}"]`);
    if (resumeBtn) {
      ctx.dispatch({ type: "RESUME_SESSION" });
      return;
    }

    // Discard session
    const discardBtn = target.closest(`[data-action="${ACTIONS.DISCARD_SESSION}"]`);
    if (discardBtn) {
      // Show confirm modal before discarding
      ctx.showModal({
        type: "confirm",
        title: "Discard Session?",
        message: "This will permanently delete your previous session. Are you sure?",
        confirmText: "Discard",
        cancelText: "Keep",
        onConfirm: () => {
          // Dispatch a discard action - we'll handle this in app.ts
          discardIncompleteFromBanner(ctx);
        },
      });
      return;
    }
  };

  container.addEventListener("click", handleClick);

  cleanup = () => {
    container.removeEventListener("click", handleClick);
  };
}

// Helper to discard from banner (avoids needing a new action type)
async function discardIncompleteFromBanner(ctx: ScreenContext): Promise<void> {
  const state = ctx.state;
  if (state.incompleteSession) {
    // Import dynamically to avoid circular dependency
    const { deleteSession } = await import("../storage");
    const { showToast } = await import("../app");
    try {
      await deleteSession(state.incompleteSession.id);
      showToast("Previous session discarded", "info");
      // Force re-render by navigating home
      window.location.hash = "#/";
    } catch (error) {
      console.error("Failed to discard session:", error);
      showToast("Failed to discard session", "error");
    }
  }
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
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
