/**
 * E2E Test Helpers
 *
 * Common utilities for Playwright tests.
 * These helpers abstract away selector details and provide consistent patterns
 * for navigating through the app.
 */

import { type Page, expect } from "playwright/test";

// ============================================================================
// Types
// ============================================================================

export type ScreenName =
  | "dashboard"
  | "home"
  | "prep"
  | "coding"
  | "silent"
  | "summary"
  | "reflection"
  | "done"
  | "view";

export interface AppState {
  screen: ScreenName;
  sessionId: string | null;
  status: string;
  isPaused: boolean;
  phase: string | null;
  code: string;
  invariants: string;
  nudgesUsed: number;
  nudgesAllowed: number;
  isRecording: boolean;
  audioSupported: boolean;
  audioPermissionDenied: boolean;
}

export interface ReflectionFormData {
  clearApproach: "yes" | "partially" | "no";
  prolongedStall: "yes" | "no";
  recoveredFromStall: "yes" | "partially" | "no" | "n/a";
  timePressure: "comfortable" | "manageable" | "overwhelming";
  wouldChangeApproach: "yes" | "no";
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Clear all storage and verify it's empty.
 * After clearing, reloads the page to ensure fresh component state.
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.waitForFunction(() => window.IDS?.storage?.clearAll);
  await page.evaluate(() => window.IDS.storage.clearAll());

  await page.waitForFunction(
    () => {
      return window.IDS.storage
        .getStats()
        .then(
          (stats: { sessionCount: number; audioCount: number }) =>
            stats.sessionCount === 0 && stats.audioCount === 0,
        );
    },
    undefined,
    { timeout: 5000 },
  );

  // Reload to ensure fresh component state after clearing storage
  await page.reload();
  await page.waitForFunction(() => window.IDS?.getAppState);
}

/**
 * Wait for a session to be persisted to storage.
 */
export async function waitForSessionPersisted(
  page: Page,
  sessionId: string,
  timeout = 5000,
): Promise<void> {
  await page.waitForFunction(
    (id) => {
      return window.IDS.storage.getSession(id).then((session: unknown) => session !== null);
    },
    sessionId,
    { timeout },
  );
}

// ============================================================================
// State Helpers
// ============================================================================

/**
 * Get the current app state.
 */
export async function getAppState(page: Page): Promise<AppState> {
  return page.evaluate(() => {
    const state = window.IDS.getAppState();
    return {
      screen: state.screen,
      sessionId: state.sessionId,
      status: state.status,
      isPaused: state.isPaused,
      phase: state.sessionState?.phase ?? null,
      code: state.code,
      invariants: state.invariants,
      nudgesUsed: state.nudgesUsed,
      nudgesAllowed: state.nudgesAllowed,
      isRecording: state.isRecording,
      audioSupported: state.audioSupported,
      audioPermissionDenied: state.audioPermissionDenied,
    };
  });
}

/**
 * Wait for the app to reach a specific screen.
 */
export async function waitForScreen(
  page: Page,
  screen: ScreenName,
  timeout = 10000,
): Promise<void> {
  await page.waitForFunction(
    (expectedScreen) => window.IDS.getAppState().screen === expectedScreen,
    screen,
    { timeout },
  );
}

/**
 * Wait for a session to be active.
 */
export async function waitForSession(page: Page, timeout = 10000): Promise<string> {
  await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null, undefined, {
    timeout,
  });
  const state = await getAppState(page);
  return state.sessionId!;
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to the dashboard.
 * Note: The store's "screen" stays as "dashboard" when there's no active session.
 */
export async function goToDashboard(page: Page): Promise<void> {
  // Use hash navigation to trigger router
  await page.evaluate(() => (window.location.hash = "#/"));
  await page.waitForFunction(() => window.IDS?.getAppState);

  // Wait for the DashboardScreen to render (New Session button or session list indicates it's ready)
  await page.waitForSelector('button:has-text("New Session"), .session-list, .stats-grid', {
    timeout: 10000,
  });
}

/**
 * Navigate to the new session screen.
 * Note: The store's "screen" doesn't change to "home" until a session starts,
 * so we wait for the Start Session button to be visible instead.
 */
export async function goToNewSession(page: Page): Promise<void> {
  await page.goto("/#/new");
  await page.waitForFunction(() => window.IDS?.getAppState);
  // Wait for the HomeScreen to render (Start Session button indicates it's ready)
  await page.waitForSelector('button:has-text("Start Session")', { timeout: 10000 });
}

/**
 * Navigate to a specific session by ID.
 */
export async function goToSession(page: Page, sessionId: string): Promise<void> {
  await page.goto(`/#/${sessionId}`);
  await page.waitForFunction(() => window.IDS?.getAppState);
}

// ============================================================================
// Session Flow Helpers
// ============================================================================

/**
 * Start a new session from the new session screen.
 * Returns the session ID.
 */
export async function startSession(page: Page): Promise<string> {
  // Click Start Session button
  await page.click('button:has-text("Start Session")');
  await waitForScreen(page, "prep");

  const sessionId = await waitForSession(page);

  // Wait for URL to update to include session ID
  await page.waitForFunction((id) => window.location.hash.includes(id!), sessionId, {
    timeout: 5000,
  });

  return sessionId;
}

/**
 * Navigate from the dashboard to start a new session.
 * Handles the full flow: Dashboard -> New Session -> Start.
 */
export async function startNewSessionFromDashboard(page: Page): Promise<string> {
  await goToDashboard(page);
  await page.click('button:has-text("New Session")');
  await waitForScreen(page, "home");
  return startSession(page);
}

/**
 * Transition from PREP to CODING phase.
 */
export async function goToCoding(page: Page): Promise<void> {
  await page.click('button:has-text("Start Coding")');
  await waitForScreen(page, "coding");
}

/**
 * Submit solution and go to SUMMARY phase.
 */
export async function submitSolution(page: Page): Promise<void> {
  await page.click('button:has-text("Submit Solution")');
  await waitForScreen(page, "summary");
}

/**
 * Continue from SUMMARY to REFLECTION phase.
 */
export async function goToReflection(page: Page): Promise<void> {
  await page.click('button:has-text("Continue to Reflection")');
  await waitForScreen(page, "reflection");
}

/**
 * Fill out the reflection form with the given responses.
 */
export async function fillReflectionForm(page: Page, responses: ReflectionFormData): Promise<void> {
  // Clear approach
  await page.click(`input[name="clearApproach"][value="${responses.clearApproach}"]`);

  // Prolonged stall
  await page.click(`input[name="prolongedStall"][value="${responses.prolongedStall}"]`);

  // Recovered from stall
  await page.click(`input[name="recoveredFromStall"][value="${responses.recoveredFromStall}"]`);

  // Time pressure
  await page.click(`input[name="timePressure"][value="${responses.timePressure}"]`);

  // Would change approach
  await page.click(`input[name="wouldChangeApproach"][value="${responses.wouldChangeApproach}"]`);
}

/**
 * Submit the reflection form.
 */
export async function submitReflection(page: Page): Promise<void> {
  await page.click('button:has-text("Submit Reflection")');
  await waitForScreen(page, "done");
}

/**
 * Complete the entire reflection phase with default responses.
 */
export async function completeReflection(
  page: Page,
  responses?: Partial<ReflectionFormData>,
): Promise<void> {
  const defaultResponses: ReflectionFormData = {
    clearApproach: "yes",
    prolongedStall: "no",
    recoveredFromStall: "n/a",
    timePressure: "comfortable",
    wouldChangeApproach: "no",
  };

  await fillReflectionForm(page, { ...defaultResponses, ...responses });
  await submitReflection(page);
}

/**
 * Complete an entire session from PREP to DONE.
 */
export async function completeFullSession(
  page: Page,
  options?: {
    invariants?: string;
    code?: string;
    reflectionResponses?: Partial<ReflectionFormData>;
  },
): Promise<string> {
  // Start session
  const sessionId = await startSession(page);

  // Optionally fill invariants
  if (options?.invariants) {
    await page.fill('textarea[placeholder*="What are the input constraints"]', options.invariants);
  }

  // Go to coding
  await goToCoding(page);

  // Optionally fill code
  if (options?.code) {
    await page.evaluate((code) => window.IDS.updateCode(code), options.code);
  }

  // Submit and go through to done
  await submitSolution(page);
  await goToReflection(page);
  await completeReflection(page, options?.reflectionResponses);

  return sessionId;
}

// ============================================================================
// Action Helpers
// ============================================================================

/**
 * Abandon the current session via IDS API and navigate to dashboard.
 */
export async function abandonSession(page: Page): Promise<void> {
  await page.evaluate(() => window.IDS.abandonSession());
  await page.evaluate(() => window.IDS.router.navigate("/"));
  // Wait for dashboard to be ready
  await page.waitForSelector('button:has-text("New Session"), .session-list, .stats-grid', {
    timeout: 10000,
  });
}

/**
 * Abandon session by clicking the Abandon button (two-click pattern).
 */
export async function abandonSessionViaButton(page: Page): Promise<void> {
  // First click - shows "Confirm?"
  await page.click('button:has-text("Abandon Session")');

  // Second click - confirms
  await page.click('button:has-text("Confirm")');

  // Wait for dashboard to be ready
  await page.waitForSelector('button:has-text("New Session"), .session-list, .stats-grid', {
    timeout: 10000,
  });
}

/**
 * Pause the current session.
 */
export async function pauseSession(page: Page): Promise<void> {
  await page.click('button:has-text("Pause")');
  await page.waitForFunction(() => window.IDS.getAppState().isPaused === true);
}

/**
 * Resume the current session.
 * Clicks the Resume button in the paused-overlay (which appears when paused).
 */
export async function resumeSession(page: Page): Promise<void> {
  // Click the Resume button in the paused overlay (not the header button)
  await page.click('.paused-overlay button:has-text("Resume")');
  await page.waitForFunction(() => window.IDS.getAppState().isPaused === false);
}

/**
 * Request a nudge.
 */
export async function requestNudge(page: Page): Promise<void> {
  await page.click('button:has-text("Nudge")');
}

/**
 * Update code via IDS API.
 */
export async function updateCode(page: Page, code: string): Promise<void> {
  await page.evaluate((c) => window.IDS.updateCode(c), code);
}

/**
 * Update invariants via IDS API.
 */
export async function updateInvariants(page: Page, invariants: string): Promise<void> {
  await page.evaluate((i) => window.IDS.updateInvariants(i), invariants);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that the current screen matches expected.
 */
export async function expectScreen(page: Page, screen: ScreenName): Promise<void> {
  const state = await getAppState(page);
  expect(state.screen).toBe(screen);
}

/**
 * Assert that a session exists in storage.
 */
export async function expectSessionInStorage(page: Page, sessionId: string): Promise<void> {
  const session = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId);
  expect(session).not.toBeNull();
}

/**
 * Assert that a session does NOT exist in storage.
 */
export async function expectSessionNotInStorage(page: Page, sessionId: string): Promise<void> {
  const session = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId);
  expect(session).toBeNull();
}

/**
 * Assert URL matches expected pattern.
 */
export async function expectUrlToBe(page: Page, pattern: RegExp | string): Promise<void> {
  if (typeof pattern === "string") {
    expect(page.url()).toContain(pattern);
  } else {
    expect(page.url()).toMatch(pattern);
  }
}

/**
 * Assert we're at the dashboard URL.
 */
export async function expectAtDashboard(page: Page): Promise<void> {
  expect(page.url()).toMatch(/\/#?\/?$/);
}
