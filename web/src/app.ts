/**
 * App Controller
 *
 * Manages application state and coordinates between core engine, storage, router, and UI.
 * This is a minimal implementation for Phase B - full implementation in Phase F.
 */

import { createSession, type Preset, Preset as PresetEnum, Phase } from "../../core/src/index";
import { getRandomProblem } from "./problems";
import type { AppState, Route, StoredSession, ScreenName } from "./types";
import {
  initStorage,
  isStorageInitialized,
  saveSession,
  getSession,
  getIncompleteSession,
  deleteSession,
  getStorageStats,
} from "./storage";
import {
  initRouter,
  getCurrentRoute,
  onRouteChange,
  navigateHome,
  navigateToSession,
  replaceRoute,
  isDebugMode,
} from "./router";
import { IDS } from "./constants";

// ============================================================================
// App State
// ============================================================================

let appState: AppState = {
  screen: "home",
  selectedPreset: PresetEnum.Standard,
  session: null,
  sessionState: null,
  problem: null,
  sessionId: null,
  audioSupported: false,
  audioPermissionDenied: false,
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
  render();
}

function phaseToScreen(phase: Phase | undefined): ScreenName {
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

async function syncSessionState(): Promise<void> {
  if (appState.session) {
    const sessionState = appState.session.getState();
    const screen = phaseToScreen(sessionState.phase);

    // Update URL if phase changed
    if (sessionState.id && sessionState.phase) {
      const currentRoute = getCurrentRoute();
      if (
        currentRoute.type !== "session" ||
        currentRoute.sessionId !== sessionState.id ||
        currentRoute.phase !== sessionState.phase
      ) {
        navigateToSession(sessionState.id, sessionState.phase);
      }
    }

    updateState({ sessionState, screen });

    // Persist to storage
    await persistSession();
  }
}

// ============================================================================
// Persistence
// ============================================================================

async function persistSession(): Promise<void> {
  if (!appState.session || !appState.problem) return;

  const state = appState.session.getState();
  if (!state.id) return;

  const storedSession: StoredSession = {
    id: state.id,
    events: appState.session.getEvents(),
    problem: appState.problem,
    preset: state.preset,
    createdAt: state.sessionStartedAt ?? Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await saveSession(storedSession);
  } catch (error) {
    console.error("Failed to persist session:", error);
  }
}

async function loadSession(sessionId: string): Promise<boolean> {
  try {
    const stored = await getSession(sessionId);
    if (!stored) return false;

    // Recreate session from stored events
    const session = createSession({
      preset: stored.preset,
      problem: stored.problem,
    });

    // Restore events
    session.restore(stored.events);

    // Subscribe to future events
    session.subscribe((event, state) => {
      console.log("Session event:", event.type, state.phase);
      syncSessionState();
    });

    const sessionState = session.getState();

    updateState({
      session,
      sessionState,
      problem: stored.problem,
      sessionId: stored.id,
      screen: phaseToScreen(sessionState.phase),
    });

    startTimer();
    return true;
  } catch (error) {
    console.error("Failed to load session:", error);
    return false;
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

export async function startSession(): Promise<void> {
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

  const sessionState = session.getState();

  updateState({
    session,
    problem,
    sessionState,
    sessionId: sessionState.id ?? null,
    screen: "prep",
  });

  // Navigate to session URL (syncSessionState will also do this, but we do it here
  // to ensure the URL is set before the route handler runs)
  if (sessionState.id && sessionState.phase) {
    navigateToSession(sessionState.id, sessionState.phase);
  }

  // Persist session to storage
  await persistSession();

  startTimer();
}

export async function updateInvariants(invariants: string): Promise<void> {
  if (!appState.session) return;
  appState.session.dispatch("prep.invariants_changed", { invariants });
  await syncSessionState();
}

export async function startCoding(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("coding.started");
  if (!result.ok) {
    console.error("Failed to start coding:", result.error);
    return;
  }

  await syncSessionState();
}

export async function updateCode(code: string): Promise<void> {
  if (!appState.session) return;
  appState.session.dispatch("coding.code_changed", { code });
  await syncSessionState();
}

export async function requestNudge(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("nudge.requested");
  if (!result.ok) {
    console.error("Nudge request failed:", result.error);
  }
  await syncSessionState();
}

export async function submitSolution(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("coding.solution_submitted");
  if (!result.ok) {
    console.error("Failed to submit solution:", result.error);
    return;
  }

  await syncSessionState();
}

export async function startSilentPhase(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("coding.silent_started");
  if (!result.ok) {
    console.error("Failed to start silent phase:", result.error);
    return;
  }

  await syncSessionState();
}

export async function endSilentPhase(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("silent.ended");
  if (!result.ok) {
    console.error("Failed to end silent phase:", result.error);
    return;
  }

  await syncSessionState();
}

export async function continuePastSummary(): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("summary.continued");
  if (!result.ok) {
    console.error("Failed to continue past summary:", result.error);
    return;
  }

  await syncSessionState();
}

export async function submitReflection(responses: {
  clearApproach: "yes" | "partially" | "no";
  prolongedStall: "yes" | "no";
  recoveredFromStall: "yes" | "partially" | "no" | "n/a";
  timePressure: "comfortable" | "manageable" | "overwhelming";
  wouldChangeApproach: "yes" | "no";
}): Promise<void> {
  if (!appState.session) return;

  const result = appState.session.dispatch("reflection.submitted", { responses });
  if (!result.ok) {
    console.error("Failed to submit reflection:", result.error);
    return;
  }

  await syncSessionState();
}

export async function abandonSession(): Promise<void> {
  if (!appState.session) return;

  appState.session.dispatch("session.abandoned");
  stopTimer();

  // Delete from storage
  if (appState.sessionId) {
    try {
      await deleteSession(appState.sessionId);
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  }

  resetApp();
}

export function resetApp(): void {
  stopTimer();
  appState = {
    screen: "home",
    selectedPreset: PresetEnum.Standard,
    session: null,
    sessionState: null,
    problem: null,
    sessionId: null,
    audioSupported: appState.audioSupported,
    audioPermissionDenied: false,
  };
  navigateHome();
  render();
}

// ============================================================================
// Route Handling
// ============================================================================

async function handleRoute(route: Route): Promise<void> {
  if (route.type === "home") {
    // If we have an active session, don't override it when going home
    if (appState.session) {
      return;
    }

    // Check for incomplete session to resume
    const incomplete = await getIncompleteSession();
    if (incomplete) {
      // TODO: Show resume modal in Phase E
      console.log("Found incomplete session:", incomplete.id);
    }
    updateState({ screen: "home" });
    return;
  }

  if (route.type === "session") {
    // If we already have this session active, just verify phase
    const currentSessionId = appState.sessionState?.id;
    if (currentSessionId === route.sessionId) {
      // Check if requested phase matches actual phase
      const actualPhase = appState.sessionState?.phase;
      if (actualPhase && actualPhase !== route.phase) {
        // Redirect to correct phase
        console.warn(`Phase mismatch: requested ${route.phase}, actual ${actualPhase}`);
        // TODO: Show toast "Redirected to current phase" in Phase C
        replaceRoute({ type: "session", sessionId: route.sessionId, phase: actualPhase });
      }
      return;
    }

    // Try to load the session from storage
    const loaded = await loadSession(route.sessionId);

    if (!loaded) {
      // Session not found, redirect to home
      console.warn("Session not found:", route.sessionId);
      // TODO: Show toast "Session not found" in Phase C
      navigateHome();
      return;
    }

    // Check if requested phase matches actual phase
    const actualPhase = appState.sessionState?.phase;
    if (actualPhase && actualPhase !== route.phase) {
      // Redirect to correct phase
      console.warn(`Phase mismatch: requested ${route.phase}, actual ${actualPhase}`);
      // TODO: Show toast "Redirected to current phase" in Phase C
      replaceRoute({ type: "session", sessionId: route.sessionId, phase: actualPhase });
    }

    return;
  }

  // not_found
  navigateHome();
}

// ============================================================================
// Rendering
// ============================================================================

function render(): void {
  const app = document.getElementById(IDS.APP);
  if (!app) return;

  // Check if debug mode is enabled
  if (isDebugMode()) {
    app.innerHTML = renderDebugView();
    attachDebugEventListeners();
    return;
  }

  // For Phase B, we render a minimal view
  // Full screen rendering comes in Phase D
  app.innerHTML = renderMinimalView();
  attachMinimalEventListeners();
}

function renderDebugView(): string {
  const route = getCurrentRoute();
  const state = appState.sessionState;
  const events = appState.session?.getEvents() ?? [];

  return `
    <div class="debug-view">
      <div class="debug-header">
        <h1>Debug View</h1>
        <p class="hint">Add ?debug=1 to URL to see this view</p>
      </div>

      <div class="debug-section">
        <h3>Route</h3>
        <pre>${JSON.stringify(route, null, 2)}</pre>
      </div>

      <div class="debug-section">
        <h3>Storage</h3>
        <pre>Initialized: ${isStorageInitialized()}</pre>
        <button class="btn-secondary" data-action="check-storage">Check Stats</button>
        <button class="btn-secondary" data-action="clear-storage">Clear All</button>
        <div id="storage-stats"></div>
      </div>

      <div class="debug-section">
        <h3>App State</h3>
        <pre>Screen: ${appState.screen}
Session ID: ${appState.sessionId ?? "null"}
Preset: ${appState.selectedPreset}
Problem: ${appState.problem?.title ?? "null"}</pre>
      </div>

      <div class="debug-section">
        <h3>Session State</h3>
        <pre>${state ? JSON.stringify(state, null, 2) : "No active session"}</pre>
      </div>

      <div class="debug-section">
        <h3>Events (${events.length})</h3>
        <div class="events-list">
          ${events
            .map((e, i) => `<div class="event-item">${i + 1}. ${e.type} @ ${e.timestamp}ms</div>`)
            .join("")}
        </div>
      </div>

      <div class="debug-section">
        <h3>Actions</h3>
        <div class="debug-actions">
          <button class="btn-primary" data-action="start-session">Start Session</button>
          <button class="btn-secondary" data-action="go-home">Go Home</button>
          ${
            appState.session
              ? `
            <button class="btn-secondary" data-action="start-coding">Start Coding</button>
            <button class="btn-secondary" data-action="submit-solution">Submit Solution</button>
            <button class="btn-secondary" data-action="start-silent">Start Silent</button>
            <button class="btn-secondary" data-action="end-silent">End Silent</button>
            <button class="btn-secondary" data-action="continue-summary">Continue Summary</button>
            <button class="btn-danger" data-action="abandon">Abandon</button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function attachDebugEventListeners(): void {
  document.querySelector('[data-action="start-session"]')?.addEventListener("click", startSession);
  document.querySelector('[data-action="go-home"]')?.addEventListener("click", resetApp);
  document.querySelector('[data-action="start-coding"]')?.addEventListener("click", startCoding);
  document
    .querySelector('[data-action="submit-solution"]')
    ?.addEventListener("click", submitSolution);
  document
    .querySelector('[data-action="start-silent"]')
    ?.addEventListener("click", startSilentPhase);
  document.querySelector('[data-action="end-silent"]')?.addEventListener("click", endSilentPhase);
  document
    .querySelector('[data-action="continue-summary"]')
    ?.addEventListener("click", continuePastSummary);
  document.querySelector('[data-action="abandon"]')?.addEventListener("click", abandonSession);

  document.querySelector('[data-action="check-storage"]')?.addEventListener("click", async () => {
    const stats = await getStorageStats();
    const el = document.getElementById("storage-stats");
    if (el) {
      el.innerHTML = `<pre>Sessions: ${stats.sessionCount}, Audio: ${stats.audioCount}</pre>`;
    }
  });

  document.querySelector('[data-action="clear-storage"]')?.addEventListener("click", async () => {
    const { clearAllStorage } = await import("./storage");
    await clearAllStorage();
    const el = document.getElementById("storage-stats");
    if (el) {
      el.innerHTML = `<pre>Storage cleared!</pre>`;
    }
  });
}

function renderMinimalView(): string {
  // Minimal view for Phase B - just shows current state
  // Will be replaced with proper screens in Phase D
  return `
    <div class="home-screen">
      <h1>Interview Conditioning Studio</h1>
      <p class="tagline">Practice technical interviews under realistic conditions</p>

      ${
        appState.screen === "home"
          ? `
        <div class="preset-selector">
          <h2>Select Difficulty</h2>
          <div class="preset-cards">
            <button class="preset-card ${appState.selectedPreset === "standard" ? "selected" : ""}" data-preset="standard">
              <span class="preset-label">Standard</span>
              <span class="preset-desc">5 min prep, 35 min coding, 3 nudges</span>
            </button>
            <button class="preset-card ${appState.selectedPreset === "high_pressure" ? "selected" : ""}" data-preset="high_pressure">
              <span class="preset-label">High Pressure</span>
              <span class="preset-desc">3 min prep, 25 min coding, 1 nudge</span>
            </button>
            <button class="preset-card ${appState.selectedPreset === "no_assistance" ? "selected" : ""}" data-preset="no_assistance">
              <span class="preset-label">No Assistance</span>
              <span class="preset-desc">5 min prep, 35 min coding, 0 nudges</span>
            </button>
          </div>
        </div>
        <button class="btn-primary btn-large start-button">Start Session</button>
      `
          : `
        <div class="session-info">
          <p>Session: ${appState.sessionId}</p>
          <p>Phase: ${appState.sessionState?.phase ?? "unknown"}</p>
          <p>Problem: ${appState.problem?.title ?? "unknown"}</p>
          <p class="hint">Add ?debug=1 to URL for full debug view</p>
        </div>
        <button class="btn-secondary" data-action="go-home">Back to Home</button>
      `
      }
    </div>
  `;
}

function attachMinimalEventListeners(): void {
  // Preset selection
  document.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const preset = (e.currentTarget as HTMLElement).dataset.preset as Preset;
      selectPreset(preset);
    });
  });

  // Start session
  document.querySelector(".start-button")?.addEventListener("click", startSession);

  // Go home
  document.querySelector('[data-action="go-home"]')?.addEventListener("click", resetApp);
}

// ============================================================================
// Initialization
// ============================================================================

export async function initApp(): Promise<void> {
  // Initialize storage
  try {
    await initStorage();
    console.log("Storage initialized");
  } catch (error) {
    console.error("Failed to initialize storage:", error);
  }

  // Initialize router
  initRouter();

  // Handle initial route
  const route = getCurrentRoute();
  await handleRoute(route);

  // Listen for route changes
  onRouteChange(async (route) => {
    await handleRoute(route);
  });

  // Check audio support
  appState.audioSupported =
    typeof MediaRecorder !== "undefined" &&
    (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ||
      MediaRecorder.isTypeSupported("audio/mp4"));

  // Initial render
  render();
}
