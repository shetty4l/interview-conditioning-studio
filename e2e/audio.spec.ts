import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  completeFullSession,
  waitForScreen,
} from "./_helpers";

/**
 * Audio Recording E2E Tests
 *
 * Tests for audio recording functionality.
 * Note: These tests check UI and state behavior without requiring actual
 * MediaRecorder functionality, which may not be available in test environments.
 */

test.describe("Audio Recording UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("audioSupported state is set on app init", async ({ page }) => {
    // Check that audioSupported is a boolean (true or false depending on browser)
    const audioSupported = await page.evaluate(() => window.IDS.getAppState().audioSupported);
    expect(typeof audioSupported).toBe("boolean");
  });

  test("isRecording starts as false", async ({ page }) => {
    const isRecording = await page.evaluate(() => window.IDS.getAppState().isRecording);
    expect(isRecording).toBe(false);
  });

  test("audioPermissionDenied starts as false", async ({ page }) => {
    const permissionDenied = await page.evaluate(
      () => window.IDS.getAppState().audioPermissionDenied,
    );
    expect(permissionDenied).toBe(false);
  });

  test("Recording indicator visibility depends on audioSupported", async ({ page }) => {
    // Start a session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Check if audio is supported
    const audioSupported = await page.evaluate(() => window.IDS.getAppState().audioSupported);

    if (audioSupported) {
      // Recording indicator should be visible when recording is active
      // With auto-recording, this may be visible or paused depending on state
      const isRecording = await page.evaluate(() => window.IDS.getAppState().isRecording);
      if (isRecording) {
        await expect(page.locator(".recording-indicator")).toBeVisible();
      }
    }
    // When audio is not supported, there should be no recording-related UI
  });

  test("Submit button is always visible in CODING phase", async ({ page }) => {
    // Start a session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Submit button should always be visible regardless of audio support
    await expect(page.locator('button:has-text("Submit Solution")')).toBeVisible();
  });

  test("isRecording is reset on session reset", async ({ page }) => {
    // Start a session
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Reset app
    await page.evaluate(() => window.IDS.resetApp());

    // Wait for reset to complete - store screen becomes "dashboard" after reset
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // isRecording should be false after reset
    const isRecording = await page.evaluate(() => window.IDS.getAppState().isRecording);
    expect(isRecording).toBe(false);
  });
});

test.describe("Audio Storage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("audio storage functions are available", async ({ page }) => {
    // Check storage API is available
    const hasAudioFunctions = await page.evaluate(() => {
      const storage = window.IDS.storage;
      return typeof storage.getStats === "function";
    });

    expect(hasAudioFunctions).toBe(true);
  });

  test("audio count starts at zero", async ({ page }) => {
    const stats = await page.evaluate(() => window.IDS.storage.getStats());
    expect(stats.audioCount).toBe(0);
  });
});

// ============================================================================
// Phase 3 Edge Cases - Audio Tests
// ============================================================================

test.describe("Audio - Phase 3 Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  // Edge case #3: Auto-record permission denied - show MicStatusIndicator blocked state
  test.skip("should show blocked indicator when audio permission is denied", async ({ page }) => {
    // Mock permission denied by setting up a context with denied permissions
    // Note: Playwright can control permissions via context.grantPermissions()
    // For this test, we need to deny the microphone permission

    // Start a session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Check if audio is supported
    const audioSupported = await page.evaluate(() => window.IDS.getAppState().audioSupported);

    if (audioSupported) {
      // With auto-recording in Phase 3, recording should attempt to start
      // If permission is denied, MicStatusIndicator should show "blocked" state
      // This test documents the expected behavior

      // The indicator should show permission denied state
      await expect(
        page.locator('.mic-status-indicator[data-state="blocked"], .mic-status--blocked'),
      ).toBeVisible();

      // State should reflect permission denied
      const permissionDenied = await page.evaluate(
        () => window.IDS.getAppState().audioPermissionDenied,
      );
      expect(permissionDenied).toBe(true);
    }
  });

  // Additional: Verify MicStatusIndicator shows correct states
  test.skip("should show correct mic status indicator states", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    const audioSupported = await page.evaluate(() => window.IDS.getAppState().audioSupported);

    if (audioSupported) {
      // With auto-recording, should show "recording" state when active
      const isRecording = await page.evaluate(() => window.IDS.getAppState().isRecording);

      if (isRecording) {
        // Should show recording indicator
        await expect(
          page.locator('.mic-status-indicator[data-state="recording"], .mic-status--recording'),
        ).toBeVisible();
      } else {
        // Should show ready or blocked state
        await expect(
          page.locator(
            '.mic-status-indicator[data-state="ready"], .mic-status-indicator[data-state="blocked"], .mic-status--ready, .mic-status--blocked',
          ),
        ).toBeVisible();
      }
    } else {
      // Should show unsupported state
      await expect(
        page.locator('.mic-status-indicator[data-state="unsupported"], .mic-status--unsupported'),
      ).toBeVisible();
    }
  });
});

// ============================================================================
// Audio Cleanup Tests
// ============================================================================

test.describe("Audio Cleanup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  // Test: Startup should clean up orphaned audio from completed sessions
  test("should clean up orphaned audio on app startup", async ({ page }) => {
    // Complete a session
    await goToNewSession(page);
    const sessionId = await completeFullSession(page);

    // Mock audio for the completed session (simulates audio that wasn't cleaned up)
    await page.evaluate(async (id) => {
      const fakeChunk = new Blob(["fake audio data"], { type: "audio/webm" });
      await window.IDS.storage.saveAudioChunk(id, fakeChunk, "audio/webm");
    }, sessionId);

    // Verify audio exists before reload
    const beforeReload = await page.evaluate(() => window.IDS.storage.getStats());
    expect(beforeReload.audioCount).toBe(1);

    // Reload page (triggers init() which should clean up orphaned audio)
    await page.reload();
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Audio should be cleaned up because session is completed (not in-progress)
    const afterReload = await page.evaluate(() => window.IDS.storage.getStats());
    expect(afterReload.audioCount).toBe(0);
  });

  // Test: DoneScreen navigation should delete audio
  test("should delete audio when navigating away from done screen", async ({ page }) => {
    // Start a session
    await goToNewSession(page);
    const sessionId = await startSession(page);

    // Mock audio during the session
    await page.evaluate(async (id) => {
      const fakeChunk = new Blob(["fake audio data"], { type: "audio/webm" });
      await window.IDS.storage.saveAudioChunk(id, fakeChunk, "audio/webm");
    }, sessionId);

    // Complete the session to reach DoneScreen
    await goToCoding(page);
    await page.click('button:has-text("Submit Solution")');
    await waitForScreen(page, "summary");
    await page.click('button:has-text("Continue to Reflection")');
    await waitForScreen(page, "reflection");

    // Fill reflection
    await page.click('input[name="clearApproach"][value="yes"]');
    await page.click('input[name="prolongedStall"][value="no"]');
    await page.click('input[name="recoveredFromStall"][value="n/a"]');
    await page.click('input[name="timePressure"][value="comfortable"]');
    await page.click('input[name="wouldChangeApproach"][value="no"]');
    await page.click('button:has-text("Submit Reflection")');
    await waitForScreen(page, "done");

    // Verify audio still exists on DoneScreen
    const onDoneScreen = await page.evaluate(() => window.IDS.storage.getStats());
    expect(onDoneScreen.audioCount).toBe(1);

    // Navigate away (click "Start New Session")
    await page.click('button:has-text("Start New Session")');

    // Wait for navigation to complete
    await page.waitForFunction(() => window.location.hash.includes("/new"));

    // Audio should be deleted
    const afterNav = await page.evaluate(() => window.IDS.storage.getStats());
    expect(afterNav.audioCount).toBe(0);
  });
});
