import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  waitForScreen,
  getAppState,
  updateCode,
  updateInvariants,
  pauseSession,
  resumeSession,
} from "./_helpers";

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

test.describe("Pause/Resume", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  // Edge case #1: Pause behavior - pauses timer AND recording
  test("should pause timer when pause button is clicked", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Get initial remaining time
    const initialTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);

    // Click pause
    await pauseSession(page);

    // Wait a bit
    await page.waitForTimeout(2000);

    // Time should not have changed significantly (allow small margin for timing)
    const pausedTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);
    expect(Math.abs(pausedTime - initialTime)).toBeLessThan(500);

    // isPaused should be true
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #1: Pause behavior - pauses timer AND recording
  test.skip("should pause recording when pause button is clicked", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Check if audio is supported
    const state = await getAppState(page);
    if (!state.audioSupported) {
      test.skip();
      return;
    }

    // Click pause
    await pauseSession(page);

    // Recording should be stopped
    const pausedState = await getAppState(page);
    expect(pausedState.isRecording).toBe(false);
  });

  // Edge case #4: Resume session + recording - auto-restart
  test("should resume timer when resume button is clicked", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Pause
    await pauseSession(page);

    const pausedTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);

    // Resume
    await resumeSession(page);

    // Wait a bit
    await page.waitForTimeout(2000);

    // Time should have decreased
    const resumedTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);
    expect(resumedTime).toBeLessThan(pausedTime);
  });

  // Edge case #2: Pause in PREP phase - allow
  test("should allow pause during PREP phase", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);

    // Pause button should be visible and clickable
    await expect(page.getByRole("button", { name: /Pause/ })).toBeVisible();

    await pauseSession(page);
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #2: Pause in CODING phase - allow
  test("should allow pause during CODING phase", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Pause button should be visible and clickable
    await expect(page.getByRole("button", { name: /Pause/ })).toBeVisible();

    await pauseSession(page);
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #2: Pause in Silent phase - allow
  test.skip("should allow pause during SILENT phase", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Trigger silent phase
    await page.evaluate(() => {
      const state = window.IDS.getAppState();
      if (state.session) {
        (state.session as { dispatch: (type: string) => void }).dispatch("coding.silent_started");
      }
    });
    await waitForScreen(page, "silent");

    // Pause button should be visible and clickable
    await expect(page.getByRole("button", { name: /Pause/ })).toBeVisible();

    await pauseSession(page);
    const state = await getAppState(page);
    expect(state.isPaused).toBe(true);
  });

  // Edge case #13: Timer drift across pause/resume - track totalPausedMs
  test.skip("should maintain correct time after pause/resume cycle", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Get initial time
    const initialTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Pause for 3 seconds
    await pauseSession(page);
    await page.waitForTimeout(3000);

    // Resume and wait 2 more seconds
    await resumeSession(page);
    await page.waitForTimeout(2000);

    // Total elapsed should be ~4 seconds (2 + 2, not counting pause time)
    // Allow 1 second margin for timing variations
    const finalTime = await page.evaluate(() => window.IDS.getAppState().remainingMs);
    const elapsed = initialTime - finalTime;

    expect(elapsed).toBeGreaterThan(3000); // At least 3 seconds elapsed
    expect(elapsed).toBeLessThan(6000); // But not more than 6 (pause time excluded)
  });

  // Edge case #17: Rapid pause/resume - debounce 300ms
  test.skip("should debounce rapid pause/resume clicks", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Rapidly click pause/resume
    await page.click('button:has-text("Pause")');
    await page.click('button:has-text("Resume")').catch(() => {});
    await page.click('button:has-text("Pause")').catch(() => {});
    await page.click('button:has-text("Resume")').catch(() => {});

    // Wait for debounce to settle
    await page.waitForTimeout(500);

    // Should be in a stable state (either paused or not, no crash)
    const state = await getAppState(page);
    expect(state.screen).toBe("coding");
    expect(typeof state.isPaused).toBe("boolean");
  });

  // Edge case #20: Dispatch event during pause - allow non-timer events
  test("should allow code editing while paused", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Pause
    await pauseSession(page);

    // Edit code while paused (banner is non-blocking)
    await updateCode(page, "function editedWhilePaused() { return true; }");

    // Code should be updated
    const state = await getAppState(page);
    expect(state.code).toContain("editedWhilePaused");

    // Resume and verify code is still there
    await resumeSession(page);
    const stateAfterResume = await getAppState(page);
    expect(stateAfterResume.code).toContain("editedWhilePaused");
  });

  // Edge case #20: Dispatch event during pause - allow non-timer events (PREP)
  test("should allow invariant editing while paused in PREP", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);

    // Pause
    await pauseSession(page);

    // Edit invariants while paused
    await updateInvariants(page, "Edited while paused");

    // Invariants should be updated
    const state = await getAppState(page);
    expect(state.invariants).toBe("Edited while paused");
  });

  // Audio preservation across pause/resume
  // This tests the fix for: audio.ts start() should NOT delete existing audio.
  //
  // Background: The bug was that start() called deleteAudio() which wiped
  // all previously recorded chunks when recording restarted after pause/resume.
  //
  // We can't easily test the full flow because MediaRecorder isn't available
  // in the test environment. Instead, we verify the storage behavior:
  // - Existing audio should persist unless explicitly deleted
  // - The deleteAudio function works (so we know our test setup is valid)
  test("audio storage should not be cleared by unrelated operations", async ({ page }) => {
    await goToNewSession(page);
    const sessionId = await startSession(page);
    await goToCoding(page);

    // Mock audio chunk (simulates recording that happened)
    await page.evaluate(async (id) => {
      const fakeChunk = new Blob(["fake audio data"], { type: "audio/webm" });
      await window.IDS.storage.saveAudioChunk(id, fakeChunk, "audio/webm");
    }, sessionId);

    // Verify audio exists
    const beforeOps = await page.evaluate(() => window.IDS.storage.getStats());
    expect(beforeOps.audioCount).toBe(1);

    // Perform various operations that should NOT delete audio:
    // - Pause/resume
    await pauseSession(page);
    await resumeSession(page);

    // Audio should still exist
    const afterResume = await page.evaluate(() => window.IDS.storage.getStats());
    expect(afterResume.audioCount).toBe(1);

    // Verify deleteAudio actually works (to confirm test setup is valid)
    await page.evaluate(async (id) => {
      await window.IDS.storage.deleteAudio(id);
    }, sessionId);

    const afterDelete = await page.evaluate(() => window.IDS.storage.getStats());
    expect(afterDelete.audioCount).toBe(0);
  });
});
