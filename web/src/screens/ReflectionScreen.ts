/**
 * Reflection Screen
 *
 * Five-question reflection form.
 */

import type { ScreenContext, AppState, ReflectionFormData } from "./types";
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

export function render(_state: AppState): string {
  return `
    <div class="reflection-screen" data-component="${COMPONENTS.SCREEN_REFLECTION}">
      ${PhaseHeader.render({ phase: Phase.Reflection })}

      <h2>Quick Reflection</h2>
      <p class="reflection-intro">Take a moment to reflect on your performance</p>

      <form class="reflection-form" data-form="reflection">
        <div class="question">
          <label>Did you have a clear approach before coding?</label>
          <div class="options">
            <label><input type="radio" name="clearApproach" value="yes" required> Yes</label>
            <label><input type="radio" name="clearApproach" value="partially"> Partially</label>
            <label><input type="radio" name="clearApproach" value="no"> No</label>
          </div>
        </div>

        <div class="question">
          <label>Did you experience a prolonged stall?</label>
          <div class="options">
            <label><input type="radio" name="prolongedStall" value="yes" required> Yes</label>
            <label><input type="radio" name="prolongedStall" value="no"> No</label>
          </div>
        </div>

        <div class="question">
          <label>Did you recover after getting stuck?</label>
          <div class="options">
            <label><input type="radio" name="recoveredFromStall" value="yes" required> Yes</label>
            <label><input type="radio" name="recoveredFromStall" value="partially"> Partially</label>
            <label><input type="radio" name="recoveredFromStall" value="no"> No</label>
            <label><input type="radio" name="recoveredFromStall" value="n/a"> N/A</label>
          </div>
        </div>

        <div class="question">
          <label>How did the time pressure feel?</label>
          <div class="options">
            <label><input type="radio" name="timePressure" value="comfortable" required> Comfortable</label>
            <label><input type="radio" name="timePressure" value="manageable"> Manageable</label>
            <label><input type="radio" name="timePressure" value="overwhelming"> Overwhelming</label>
          </div>
        </div>

        <div class="question">
          <label>Would you change your approach next time?</label>
          <div class="options">
            <label><input type="radio" name="wouldChangeApproach" value="yes" required> Yes</label>
            <label><input type="radio" name="wouldChangeApproach" value="no"> No</label>
          </div>
        </div>

        ${Button.render({
          label: "Submit Reflection",
          variant: "primary",
          size: "large",
          action: ACTIONS.SUBMIT_REFLECTION,
          type: "submit",
          className: "submit-reflection-button",
        })}
      </form>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(ctx: ScreenContext): void {
  const container = document.querySelector(`[data-component="${COMPONENTS.SCREEN_REFLECTION}"]`);
  if (!container) return;

  const form = container.querySelector('[data-form="reflection"]') as HTMLFormElement;
  if (!form) return;

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(form);
    const responses: ReflectionFormData = {
      clearApproach: formData.get("clearApproach") as ReflectionFormData["clearApproach"],
      prolongedStall: formData.get("prolongedStall") as ReflectionFormData["prolongedStall"],
      recoveredFromStall: formData.get(
        "recoveredFromStall",
      ) as ReflectionFormData["recoveredFromStall"],
      timePressure: formData.get("timePressure") as ReflectionFormData["timePressure"],
      wouldChangeApproach: formData.get(
        "wouldChangeApproach",
      ) as ReflectionFormData["wouldChangeApproach"],
    };

    ctx.dispatch({ type: "SUBMIT_REFLECTION", responses });
  };

  form.addEventListener("submit", handleSubmit);

  cleanup = () => {
    form.removeEventListener("submit", handleSubmit);
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
// Update (no-op - form state shouldn't be lost)
// ============================================================================

export function update(_state: AppState): boolean {
  // Return true to prevent full re-render (form would lose state)
  return true;
}
