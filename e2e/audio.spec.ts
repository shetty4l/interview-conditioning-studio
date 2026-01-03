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

  test("Record button visibility depends on audioSupported", async ({ page }) => {
    // Start a session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Check if audio is supported
    const audioSupported = await page.evaluate(() => window.IDS.getAppState().audioSupported);

    if (audioSupported) {
      // Record button should be visible when audio is supported
      await expect(page.locator('[data-action="start-recording"]')).toBeVisible();
    } else {
      // Record button should not exist when audio is not supported
      await expect(page.locator('[data-action="start-recording"]')).toHaveCount(0);
    }
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
