/**
 * App Controller
 *
 * Manages application state and coordinates between core engine and UI.
 */

import {
  createSession,
  type Session,
  type SessionState,
  type Preset,
  Preset as PresetEnum,
  Phase,
} from "../../core/src/index";
import { getRandomProblem, type Problem } from "./problems";
import { renderApp } from "./ui";

// ============================================================================
// App State
// ============================================================================

export type Screen = "home" | "prep" | "coding" | "silent" | "summary" | "reflection" | "done";

export interface AppState {
  screen: Screen;
  selectedPreset: Preset;
  session: Session | null;
  sessionState: SessionState | null;
  problem: Problem | null;
}

let appState: AppState = {
  screen: "home",
  selectedPreset: PresetEnum.Standard,
  session: null,
  sessionState: null,
  problem: null,
};

let timerInterval: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// State Management
// ============================================================================

export function getAppState(): AppState {
  return appState;
}

function updateState(updates: Partial<AppState>): void {
  appState = { ...appState, ...updates };
  renderApp(appState);
}

function syncSessionState(): void {
  if (appState.session) {
    const sessionState = appState.session.getState();
    const screen = phaseToScreen(sessionState.phase);
    updateState({ sessionState, screen });
  }
}

function phaseToScreen(phase: Phase | undefined): Screen {
  switch (phase) {
    case Phase.Prep:
      return "prep";
    case Phase.Coding:
      return "coding";
    case Phase.Silent:
      return "silent";
    case Phase.Summary:
      return "summary";
    case Phase.Reflection:
      return "reflection";
    case Phase.Done:
      return "done";
    default:
      return "home";
  }
}

// ============================================================================
// Timer
// ============================================================================

function startTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    syncSessionState();
  }, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ============================================================================
// Actions
// ============================================================================

export function selectPreset(preset: Preset): void {
  updateState({ selectedPreset: preset });
}

export function startSession(): void {
  const problem = getRandomProblem();

  const session = createSession({
    preset: appState.selectedPreset,
    problem: {
      id: problem.id,
      title: problem.title,
      description: problem.description,
    },
  });

  // Subscribe to session events
  session.subscribe((event, state) => {
    console.log("Session event:", event.type, state.phase);
    syncSessionState();

    // Stop timer when session is done
    if (state.status === "completed" || state.status === "abandoned_explicit") {
      stopTimer();
    }
  });

  // Start the session
  const result = session.dispatch("session.started");
  if (!result.ok) {
    console.error("Failed to start session:", result.error);
    return;
  }

  updateState({
    session,
    problem,
    sessionState: session.getState(),
    screen: "prep",
  });

  startTimer();
}

export function updateInvariants(invariants: string): void {
  if (!appState.session) return;

  appState.session.dispatch("prep.invariants_changed", { invariants });
  syncSessionState();
}

export function startCoding(): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("coding.started");
  if (!result.ok) {
    console.error("Failed to start coding:", result.error);
    return;
  }

  syncSessionState();
}

export function updateCode(code: string): void {
  if (!appState.session) return;

  appState.session.dispatch("coding.code_changed", { code });
  syncSessionState();
}

export function requestNudge(): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("nudge.requested");
  if (!result.ok) {
    console.error("Nudge request failed:", result.error);
  }
  syncSessionState();
}

export function startSilentPhase(): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("coding.silent_started");
  if (!result.ok) {
    console.error("Failed to start silent phase:", result.error);
    return;
  }

  syncSessionState();
}

export function endSilentPhase(): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("silent.ended");
  if (!result.ok) {
    console.error("Failed to end silent phase:", result.error);
    return;
  }

  syncSessionState();
}

export function continuePastSummary(): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("summary.continued");
  if (!result.ok) {
    console.error("Failed to continue past summary:", result.error);
    return;
  }

  syncSessionState();
}

export function submitReflection(responses: {
  clearApproach: "yes" | "partially" | "no";
  prolongedStall: "yes" | "no";
  recoveredFromStall: "yes" | "partially" | "no" | "n/a";
  timePressure: "comfortable" | "manageable" | "overwhelming";
  wouldChangeApproach: "yes" | "no";
}): void {
  if (!appState.session) return;

  const result = appState.session.dispatch("reflection.submitted", { responses });
  if (!result.ok) {
    console.error("Failed to submit reflection:", result.error);
    return;
  }

  syncSessionState();
}

export function abandonSession(): void {
  if (!appState.session) return;

  appState.session.dispatch("session.abandoned");
  stopTimer();
  syncSessionState();
}

export function resetApp(): void {
  stopTimer();
  appState = {
    screen: "home",
    selectedPreset: PresetEnum.Standard,
    session: null,
    sessionState: null,
    problem: null,
  };
  renderApp(appState);
}

// ============================================================================
// Initialize
// ============================================================================

export function initApp(): void {
  renderApp(appState);
}
