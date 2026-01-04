import { test, expect, type Page } from "playwright/test";

/**
 * Pause/Resume E2E Tests
 *
 * Tests for pause/resume functionality including:
 * - Pausing timer and recording
 * - Resuming timer and recording
 * - Pause availability across phases
 * - Timer accuracy after pause/resume
 * - Code editing while paused
 *
 * Edge cases covered:
 * - #1: Pause behavior (pauses timer AND recording)
 * - #2: Pause in Silent phase (allow)
 * - #4: Resume session + recording (auto-restart)
 * - #13: Timer drift across pause/resume
 * - #17: Rapid pause/resume (debounce)
 * - #20: Dispatch event during pause (allow non-timer events)
 */

// Type for app state with isPaused (will be added in implementation)
interface AppStateWithPause {
  isPaused: boolean;
  remainingMs: number;
  screen: string;
  code: string;
  invariants: string;
  isRecording: boolean;
  audioSupported: boolean;
  session: unknown;
}

// Helper to get app state with pause support
async function getAppState(page: Page): Promise<AppStateWithPause> {
  return page.evaluate(() => window.IDS.getAppState() as unknown as AppStateWithPause);
}

// Helper to clear storage and verify it's empty
async function clearStorageAndVerify(page: Page) {
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
}

// Helper to start a session and go to coding
async function startCodingSession(page: Page): Promise<void> {
  await page.click(".start-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

  await page.fill("#invariants", "Test invariants");
  await page.click(".start-coding-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
}

test.describe("Pause/Resume", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  // Edge case #1: Pause behavior - pauses timer AND recording
  test("should pause timer when pause button is clicked", async ({ page }) => {
    await startCodingSession(page);

    // Get initial remaining time
    const initialState = await getAppState(page);
    const initialTime = initialState.remainingMs;

    // Click pause
    await page.click('[data-action="pause-session"]');

    // Wait a bit
    await page.waitForTimeout(2000);

    // Time should not have changed significantly (allow small margin for timing)
    const pausedState = await getAppState(page);
    expect(Math.abs(pausedState.remainingMs - initialTime)).toBeLessThan(500);

    // isPaused should be true
    expect(pausedState.isPaused).toBe(true);
  });

  // Edge case #1: Pause behavior - pauses timer AND recording
  test.skip("should pause recording when pause button is clicked", async ({ page }) => {
    await startCodingSession(page);

    // Start recording (if supported)
    const state = await getAppState(page);
    if (state.audioSupported) {
      await page.click('[data-action="start-recording"]');
      await page.waitForFunction(
        () => (window.IDS.getAppState() as unknown as AppStateWithPause).isRecording === true,
      );
    }

    // Click pause
    await page.click('[data-action="pause-session"]');

    // Recording should be stopped
    const pausedState = await getAppState(page);
    expect(pausedState.isRecording).toBe(false);
  });

  // Edge case #4: Resume session + recording - auto-restart
  test("should resume timer when resume button is clicked", async ({ page }) => {
    await startCodingSession(page);

    // Pause
    await page.click('[data-action="pause-session"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isPaused === true,
    );

    const pausedState = await getAppState(page);
    const pausedTime = pausedState.remainingMs;

    // Resume - click the Resume button in the overlay
    await page.click('.paused-overlay button');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isPaused === false,
    );

    // Wait a bit
    await page.waitForTimeout(2000);

    // Time should have decreased
    const resumedState = await getAppState(page);
    expect(resumedState.remainingMs).toBeLessThan(pausedTime);
  });

  // Edge case #4: Resume session + recording - auto-restart
  test.skip("should resume recording when resume button is clicked", async ({ page }) => {
    await startCodingSession(page);

    // Start recording (if supported)
    const state = await getAppState(page);
    if (!state.audioSupported) {
      test.skip();
      return;
    }

    await page.click('[data-action="start-recording"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isRecording === true,
    );

    // Pause (stops recording)
    await page.click('[data-action="pause-session"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isRecording === false,
    );

    // Resume (should restart recording)
    await page.click('[data-action="resume-session"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isRecording === true,
    );

    const resumedState = await getAppState(page);
    expect(resumedState.isRecording).toBe(true);
  });

  // Edge case #2: Pause in Silent phase - allow
  test("should allow pause during PREP phase", async ({ page }) => {
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Pause button should be visible and clickable
    await expect(page.locator('[data-action="pause-session"]')).toBeVisible();

    await page.click('[data-action="pause-session"]');
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #2: Pause in Silent phase - allow
  test("should allow pause during CODING phase", async ({ page }) => {
    await startCodingSession(page);

    // Pause button should be visible and clickable
    await expect(page.locator('[data-action="pause-session"]')).toBeVisible();

    await page.click('[data-action="pause-session"]');
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #2: Pause in Silent phase - allow
  test.skip("should allow pause during SILENT phase", async ({ page }) => {
    await startCodingSession(page);

    // Trigger silent phase (wait for coding timer or force it)
    await page.evaluate(() => {
      // Force transition to silent using the session's dispatch method
      const state = window.IDS.getAppState();
      if (state.session) {
        (state.session as { dispatch: (type: string) => void }).dispatch("coding.silent_started");
      }
    });
    await page.waitForFunction(() => window.IDS.getAppState().screen === "silent");

    // Pause button should be visible and clickable
    await expect(page.locator('[data-action="pause-session"]')).toBeVisible();

    await page.click('[data-action="pause-session"]');
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #13: Timer drift across pause/resume - track totalPausedMs
  test.skip("should maintain correct time after pause/resume cycle", async ({ page }) => {
    await startCodingSession(page);

    // Get initial time
    const initialState = await getAppState(page);
    const initialTime = initialState.remainingMs;

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Pause for 3 seconds
    await page.click('[data-action="pause-session"]');
    await page.waitForTimeout(3000);

    // Resume and wait 2 more seconds
    await page.click('[data-action="resume-session"]');
    await page.waitForTimeout(2000);

    // Total elapsed should be ~4 seconds (2 + 2, not counting pause time)
    // Allow 1 second margin for timing variations
    const finalState = await getAppState(page);
    const elapsed = initialTime - finalState.remainingMs;

    expect(elapsed).toBeGreaterThan(3000); // At least 3 seconds elapsed
    expect(elapsed).toBeLessThan(6000); // But not more than 6 (pause time excluded)
  });

  // Edge case #17: Rapid pause/resume - debounce 300ms
  test.skip("should debounce rapid pause/resume clicks", async ({ page }) => {
    await startCodingSession(page);

    // Rapidly click pause/resume
    const pauseBtn = page.locator('[data-action="pause-session"]');
    const resumeBtn = page.locator('[data-action="resume-session"]');

    // Click rapidly
    await pauseBtn.click();
    await resumeBtn.click({ timeout: 100 }).catch(() => {}); // May not be visible yet
    await pauseBtn.click({ timeout: 100 }).catch(() => {});
    await resumeBtn.click({ timeout: 100 }).catch(() => {});

    // Wait for debounce to settle
    await page.waitForTimeout(500);

    // Should be in a stable state (either paused or not, no crash)
    const state = await getAppState(page);

    expect(state.screen).toBe("coding");
    expect(typeof state.isPaused).toBe("boolean");
  });

  // Edge case #20: Dispatch event during pause - allow non-timer events
  test("should allow code editing while paused", async ({ page }) => {
    await startCodingSession(page);

    // Pause
    await page.click('[data-action="pause-session"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isPaused === true,
    );

    // Edit code while paused (banner is non-blocking)
    await page.fill("#code", "function editedWhilePaused() { return true; }");

    // Code should be updated
    const state = await getAppState(page);
    expect(state.code).toContain("editedWhilePaused");

    // Resume using the banner button and verify code is still there
    await page.click('.paused-overlay button');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isPaused === false,
    );
    const stateAfterResume = await getAppState(page);
    expect(stateAfterResume.code).toContain("editedWhilePaused");
  });

  // Edge case #20: Dispatch event during pause - allow non-timer events (PREP)
  test("should allow invariant editing while paused in PREP", async ({ page }) => {
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Pause
    await page.click('[data-action="pause-session"]');
    await page.waitForFunction(
      () => (window.IDS.getAppState() as unknown as AppStateWithPause).isPaused === true,
    );

    // Edit invariants while paused
    await page.fill("#invariants", "Edited while paused");

    // Invariants should be updated
    const state = await getAppState(page);
    expect(state.invariants).toBe("Edited while paused");
  });
});
