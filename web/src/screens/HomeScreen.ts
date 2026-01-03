/**
 * Home Screen
 *
 * Preset selection and session start.
 */

import type { Screen, ScreenContext, AppState } from "./types";
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

  return `
    <div class="home-screen" data-component="${COMPONENTS.SCREEN_HOME}">
      <h1>Interview Conditioning Studio</h1>
      <p class="tagline">Practice technical interviews under realistic conditions</p>

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
