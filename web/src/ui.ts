/**
 * UI Rendering
 *
 * Pure functions that render the app state to the DOM.
 */

import { Preset } from "../../core/src/index";
import type { AppState } from "./app";
import {
  selectPreset,
  startSession,
  updateInvariants,
  startCoding,
  updateCode,
  requestNudge,
  continuePastSummary,
  submitReflection,
  resetApp,
} from "./app";

// ============================================================================
// Utilities
// ============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const sign = ms < 0 ? "-" : "";
  return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Screen Renderers
// ============================================================================

function renderHomeScreen(state: AppState): string {
  const presets = [
    { value: Preset.Standard, label: "Standard", desc: "5 min prep, 35 min coding, 3 nudges" },
    { value: Preset.HighPressure, label: "High Pressure", desc: "3 min prep, 25 min coding, 1 nudge" },
    { value: Preset.NoAssistance, label: "No Assistance", desc: "5 min prep, 35 min coding, 0 nudges" },
  ];

  return `
    <div class="home-screen">
      <h1>Interview Conditioning Studio</h1>
      <p class="tagline">Practice technical interviews under realistic conditions</p>

      <div class="preset-selector">
        <h2>Select Difficulty</h2>
        <div class="preset-cards">
          ${presets
            .map(
              (p) => `
            <button
              class="preset-card ${state.selectedPreset === p.value ? "selected" : ""}"
              data-preset="${p.value}"
            >
              <span class="preset-label">${p.label}</span>
              <span class="preset-desc">${p.desc}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </div>

      <button class="btn-primary btn-large start-button">
        Start Session
      </button>
    </div>
  `;
}

function renderPrepScreen(state: AppState): string {
  const { sessionState, problem } = state;
  if (!sessionState || !problem) return "";

  const timeDisplay = formatTime(sessionState.remainingTime);
  const isOvertime = sessionState.remainingTime < 0;

  return `
    <div class="prep-screen">
      <div class="phase-header">
        <span class="phase-badge phase-prep">PREP</span>
        <span class="timer ${isOvertime ? "overtime" : ""}">${timeDisplay}</span>
      </div>

      <div class="problem-section">
        <h2>${escapeHtml(problem.title)}</h2>
        <pre class="problem-description">${escapeHtml(problem.description)}</pre>
      </div>

      <div class="invariants-section">
        <label for="invariants">
          <h3>Invariants & Notes</h3>
          <p class="hint">Write down your approach, edge cases, and any assumptions</p>
        </label>
        <textarea
          id="invariants"
          class="invariants-input"
          placeholder="- Input constraints&#10;- Edge cases to consider&#10;- Initial approach..."
        >${escapeHtml(sessionState.invariants)}</textarea>
      </div>

      <button class="btn-primary btn-large start-coding-button">
        Start Coding
      </button>
    </div>
  `;
}

function renderCodingScreen(state: AppState): string {
  const { sessionState, problem } = state;
  if (!sessionState || !problem) return "";

  const timeDisplay = formatTime(sessionState.remainingTime);
  const isOvertime = sessionState.remainingTime < 0;
  const isSilent = state.screen === "silent";

  return `
    <div class="coding-screen ${isSilent ? "silent-mode" : ""}">
      <div class="phase-header">
        <span class="phase-badge ${isSilent ? "phase-silent" : "phase-coding"}">
          ${isSilent ? "SILENT" : "CODING"}
        </span>
        <span class="timer ${isOvertime ? "overtime" : ""}">${timeDisplay}</span>
        ${
          !isSilent
            ? `
          <button
            class="btn-secondary nudge-button"
            ${sessionState.nudgesRemaining <= 0 ? "disabled" : ""}
          >
            Nudge (${sessionState.nudgesRemaining})
          </button>
        `
            : ""
        }
      </div>

      ${isSilent ? '<div class="silent-banner">Silent Phase - No assistance available</div>' : ""}

      <div class="problem-summary">
        <strong>${escapeHtml(problem.title)}</strong>
        ${sessionState.invariants ? `<div class="invariants-preview">${escapeHtml(sessionState.invariants)}</div>` : ""}
      </div>

      <div class="code-section">
        <textarea
          id="code"
          class="code-input"
          placeholder="Write your solution here..."
        >${escapeHtml(sessionState.code)}</textarea>
      </div>
    </div>
  `;
}

function renderSummaryScreen(state: AppState): string {
  const { sessionState, problem } = state;
  if (!sessionState || !problem) return "";

  return `
    <div class="summary-screen">
      <div class="phase-header">
        <span class="phase-badge phase-summary">SUMMARY</span>
      </div>

      <h2>Session Complete</h2>

      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">Prep Time Used</span>
          <span class="stat-value">${sessionState.prepTimeUsed ? formatTime(sessionState.prepTimeUsed) : "N/A"}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Nudges Used</span>
          <span class="stat-value">${sessionState.nudgesUsed} / ${sessionState.nudgesUsed + sessionState.nudgesRemaining}</span>
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

      <button class="btn-primary btn-large continue-button">
        Continue to Reflection
      </button>
    </div>
  `;
}

function renderReflectionScreen(state: AppState): string {
  return `
    <div class="reflection-screen">
      <div class="phase-header">
        <span class="phase-badge phase-reflection">REFLECTION</span>
      </div>

      <h2>Quick Reflection</h2>
      <p class="reflection-intro">Take a moment to reflect on your performance</p>

      <form class="reflection-form">
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

        <button type="submit" class="btn-primary btn-large submit-reflection-button">
          Submit Reflection
        </button>
      </form>
    </div>
  `;
}

function renderDoneScreen(state: AppState): string {
  return `
    <div class="done-screen">
      <div class="phase-header">
        <span class="phase-badge phase-done">DONE</span>
      </div>

      <div class="done-content">
        <h2>Session Complete!</h2>
        <p>Great job completing your practice session.</p>

        <button class="btn-primary btn-large new-session-button">
          Start New Session
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// Main Render
// ============================================================================

export function renderApp(state: AppState): void {
  const app = document.getElementById("app");
  if (!app) return;

  let html = "";

  switch (state.screen) {
    case "home":
      html = renderHomeScreen(state);
      break;
    case "prep":
      html = renderPrepScreen(state);
      break;
    case "coding":
    case "silent":
      html = renderCodingScreen(state);
      break;
    case "summary":
      html = renderSummaryScreen(state);
      break;
    case "reflection":
      html = renderReflectionScreen(state);
      break;
    case "done":
      html = renderDoneScreen(state);
      break;
  }

  app.innerHTML = html;

  // Attach event listeners after rendering
  attachEventListeners(state);
}

// ============================================================================
// Event Listeners
// ============================================================================

function attachEventListeners(state: AppState): void {
  // Home screen
  document.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const preset = (e.currentTarget as HTMLElement).dataset.preset as Preset;
      selectPreset(preset);
    });
  });

  document.querySelector(".start-button")?.addEventListener("click", () => {
    startSession();
  });

  // Prep screen
  document.querySelector(".invariants-input")?.addEventListener("input", (e) => {
    updateInvariants((e.target as HTMLTextAreaElement).value);
  });

  document.querySelector(".start-coding-button")?.addEventListener("click", () => {
    startCoding();
  });

  // Coding screen
  document.querySelector(".code-input")?.addEventListener("input", (e) => {
    updateCode((e.target as HTMLTextAreaElement).value);
  });

  document.querySelector(".nudge-button")?.addEventListener("click", () => {
    requestNudge();
  });

  // Summary screen
  document.querySelector(".continue-button")?.addEventListener("click", () => {
    continuePastSummary();
  });

  // Reflection screen
  document.querySelector(".reflection-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    submitReflection({
      clearApproach: formData.get("clearApproach") as "yes" | "partially" | "no",
      prolongedStall: formData.get("prolongedStall") as "yes" | "no",
      recoveredFromStall: formData.get("recoveredFromStall") as "yes" | "partially" | "no" | "n/a",
      timePressure: formData.get("timePressure") as "comfortable" | "manageable" | "overwhelming",
      wouldChangeApproach: formData.get("wouldChangeApproach") as "yes" | "no",
    });
  });

  // Done screen
  document.querySelector(".new-session-button")?.addEventListener("click", () => {
    resetApp();
  });
}
