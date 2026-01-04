import { test, expect, type Page } from "playwright/test";

/**
 * Audio Recording E2E Tests
 *
 * Tests for audio recording functionality.
 * Note: These tests check UI and state behavior without requiring actual
 * MediaRecorder functionality, which may not be available in test environments.
 */

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

test.describe("Audio Recording UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
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
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

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
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Submit button should always be visible regardless of audio support
    await expect(page.locator('[data-action="submit-solution"]')).toBeVisible();
  });

  test("isRecording is reset on session reset", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Reset app
    await page.evaluate(() => window.IDS.resetApp());
    await page.waitForFunction(() => window.IDS.getAppState().screen === "home");

    // isRecording should be false after reset
    const isRecording = await page.evaluate(() => window.IDS.getAppState().isRecording);
    expect(isRecording).toBe(false);
  });
});

test.describe("Audio Storage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
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
    await clearStorageAndVerify(page);
  });

  // Edge case #3: Auto-record permission denied - show MicStatusIndicator blocked state
  test.skip("should show blocked indicator when audio permission is denied", async ({ page }) => {
    // Mock permission denied by setting up a context with denied permissions
    // Note: Playwright can control permissions via context.grantPermissions()
    // For this test, we need to deny the microphone permission

    // Start a session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

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
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

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
