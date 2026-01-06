import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  waitForScreen,
  getAppState,
  forcePhaseExpiry,
  pauseSession,
} from "./_helpers";

/**
 * Timer Expiry E2E Tests
 *
 * Tests for automatic phase transitions when timers expire.
 * Uses forcePhaseExpiry() to simulate timer expiry without waiting.
 */

test.describe("Timer Expiry Auto-Transitions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("Prep timer expiry auto-transitions to Coding phase", async ({ page }) => {
    // Start session - should be in prep phase
    await goToNewSession(page);
    await startSession(page);

    let state = await getAppState(page);
    expect(state.screen).toBe("prep");

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Should auto-transition to coding
    await waitForScreen(page, "coding");
    state = await getAppState(page);
    expect(state.screen).toBe("coding");
    expect(state.phase).toBe("CODING");
  });

  test("Coding timer expiry auto-transitions to Silent phase", async ({ page }) => {
    // Start session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    let state = await getAppState(page);
    expect(state.screen).toBe("coding");

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Should auto-transition to silent
    await waitForScreen(page, "silent");
    state = await getAppState(page);
    expect(state.screen).toBe("silent");
    expect(state.phase).toBe("SILENT");
  });

  test("Silent timer expiry auto-transitions to Summary phase", async ({ page }) => {
    // Start session, go to coding, then to silent
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Trigger silent phase
    await page.evaluate(() => {
      window.IDS.getAppState().session?.dispatch("coding.silent_started");
    });
    await waitForScreen(page, "silent");

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Should auto-transition to summary
    await waitForScreen(page, "summary");
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
    expect(state.phase).toBe("SUMMARY");
  });

  test("Timer resets to new phase duration after auto-transition", async ({ page }) => {
    // Start session with Speed Round preset (shortest timers)
    await goToNewSession(page);
    await page.getByRole("button", { name: /Speed Round/ }).click();
    await startSession(page);

    // Get prep duration from state
    let state = await getAppState(page);
    const prepDuration = await page.evaluate(() => window.IDS.getAppState().prepDurationMs);
    const codingDuration = await page.evaluate(() => window.IDS.getAppState().codingDurationMs);

    // remainingMs should be approximately prepDuration (within 5 seconds tolerance)
    expect(state.remainingMs).toBeGreaterThan(prepDuration - 5000);
    expect(state.remainingMs).toBeLessThanOrEqual(prepDuration);

    // Force expiry - transition to coding
    await forcePhaseExpiry(page);
    await waitForScreen(page, "coding");

    // remainingMs should now be approximately codingDuration
    state = await getAppState(page);
    expect(state.remainingMs).toBeGreaterThan(codingDuration - 5000);
    expect(state.remainingMs).toBeLessThanOrEqual(codingDuration);
  });

  test("Full auto-transition flow: Prep -> Coding -> Silent -> Summary", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Verify prep phase
    let state = await getAppState(page);
    expect(state.screen).toBe("prep");

    // Prep expires -> Coding
    await forcePhaseExpiry(page);
    await waitForScreen(page, "coding");
    expect((await getAppState(page)).phase).toBe("CODING");

    // Coding expires -> Silent
    await forcePhaseExpiry(page);
    await waitForScreen(page, "silent");
    expect((await getAppState(page)).phase).toBe("SILENT");

    // Silent expires -> Summary
    await forcePhaseExpiry(page);
    await waitForScreen(page, "summary");
    expect((await getAppState(page)).phase).toBe("SUMMARY");
  });

  test("Toast notification shown on prep timer expiry", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Check toast appeared
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("Moving to coding");
  });

  test("Toast notification shown on coding timer expiry", async ({ page }) => {
    // Start session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Check toast appeared
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("silent phase");
  });

  test("Toast notification shown on silent timer expiry", async ({ page }) => {
    // Start session, go to coding, then to silent
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Trigger silent phase
    await page.evaluate(() => {
      window.IDS.getAppState().session?.dispatch("coding.silent_started");
    });
    await waitForScreen(page, "silent");

    // Force timer expiry
    await forcePhaseExpiry(page);

    // Check toast appeared
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("Review your session");
  });
});

test.describe("Timer Expiry Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("Timer expiry while paused should not transition", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Pause the session
    await pauseSession(page);

    let state = await getAppState(page);
    expect(state.isPaused).toBe(true);
    expect(state.screen).toBe("prep");

    // Force timer expiry (should be ignored while paused)
    await forcePhaseExpiry(page);

    // Should still be in prep phase, paused
    state = await getAppState(page);
    expect(state.screen).toBe("prep");
    expect(state.isPaused).toBe(true);
  });

  test("Multiple rapid phase expirations handled correctly", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Rapidly trigger multiple expirations
    await forcePhaseExpiry(page); // Prep -> Coding
    await forcePhaseExpiry(page); // Coding -> Silent
    await forcePhaseExpiry(page); // Silent -> Summary

    // Should end up at summary
    await waitForScreen(page, "summary");
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
    expect(state.phase).toBe("SUMMARY");
  });

  test("Phase expiry in non-timed phase is no-op", async ({ page }) => {
    // Start session and go all the way to summary
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Submit solution to get to summary (skips silent)
    await page.click('button:has-text("Submit Solution")');
    await waitForScreen(page, "summary");

    // Force expiry in summary (non-timed phase)
    await forcePhaseExpiry(page);

    // Should still be in summary
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
  });

  test("Session state preserved through auto-transitions", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Add invariants
    await page.evaluate(() => window.IDS.updateInvariants("Test invariants for auto-transition"));

    // Force transition to coding
    await forcePhaseExpiry(page);
    await waitForScreen(page, "coding");

    // Add code
    await page.evaluate(() => window.IDS.updateCode("function test() { return 42; }"));

    // Force transition to silent
    await forcePhaseExpiry(page);
    await waitForScreen(page, "silent");

    // Force transition to summary
    await forcePhaseExpiry(page);
    await waitForScreen(page, "summary");

    // Verify state preserved
    const state = await getAppState(page);
    expect(state.invariants).toBe("Test invariants for auto-transition");
    expect(state.code).toBe("function test() { return 42; }");
  });
});
