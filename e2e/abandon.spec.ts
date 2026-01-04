import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  submitSolution,
  goToReflection,
  completeReflection,
  abandonSession,
  waitForScreen,
  waitForSessionPersisted,
  getAppState,
  expectSessionNotInStorage,
  expectAtDashboard,
} from "./_helpers";

/**
 * Abandon Session E2E Tests
 *
 * Tests for abandoning an in-progress session.
 */

test.describe("Abandon Session", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("abandonSession clears session state", async ({ page }) => {
    // Start a session
    const sessionId = await startSession(page);
    expect(sessionId).not.toBeNull();

    // Abandon session via API
    await abandonSession(page);

    // Verify state is cleared
    const state = await getAppState(page);
    expect(state.sessionId).toBeNull();
    expect(state.screen).toBe("dashboard");
  });

  test("abandonSession deletes session from storage", async ({ page }) => {
    // Start a session
    const sessionId = await startSession(page);
    await waitForSessionPersisted(page, sessionId);

    // Verify session exists in storage
    let storedSession = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId);
    expect(storedSession).not.toBeNull();

    // Abandon
    await abandonSession(page);

    // Verify session deleted from storage (soft delete)
    await expectSessionNotInStorage(page, sessionId);
  });

  test("abandonSession navigates to dashboard", async ({ page }) => {
    // Start a session and go to coding
    await startSession(page);
    await goToCoding(page);

    // Abandon
    await abandonSession(page);

    // Should be at dashboard
    await expectAtDashboard(page);
  });

  test("can abandon from PREP phase", async ({ page }) => {
    // Start session (lands on prep)
    const sessionId = await startSession(page);
    await waitForSessionPersisted(page, sessionId);

    // Abandon from prep
    await abandonSession(page);

    // Verify cleanup
    const state = await getAppState(page);
    expect(state.screen).toBe("dashboard");
    await expectSessionNotInStorage(page, sessionId);
  });

  test("can abandon from CODING phase", async ({ page }) => {
    // Start session and go to coding
    const sessionId = await startSession(page);
    await goToCoding(page);
    await waitForSessionPersisted(page, sessionId);

    // Abandon from coding
    await abandonSession(page);

    // Verify cleanup
    const state = await getAppState(page);
    expect(state.screen).toBe("dashboard");
  });

  test("can abandon from SUMMARY phase", async ({ page }) => {
    // Start session and go through to summary
    const sessionId = await startSession(page);
    await goToCoding(page);
    await submitSolution(page);
    await waitForSessionPersisted(page, sessionId);

    // Abandon from summary
    await abandonSession(page);

    // Verify cleanup
    const state = await getAppState(page);
    expect(state.screen).toBe("dashboard");
  });

  test("can abandon from REFLECTION phase", async ({ page }) => {
    // Start session and go through to reflection
    const sessionId = await startSession(page);
    await goToCoding(page);
    await submitSolution(page);
    await goToReflection(page);
    await waitForSessionPersisted(page, sessionId);

    // Abandon from reflection
    await abandonSession(page);

    // Verify cleanup
    const state = await getAppState(page);
    expect(state.screen).toBe("dashboard");
  });

  test("abandoned session does not show in resume banner", async ({ page }) => {
    // Start session
    const sessionId = await startSession(page);
    await waitForSessionPersisted(page, sessionId);

    // Abandon session
    await abandonSession(page);

    // Navigate to new session screen
    await goToNewSession(page);

    // Should not show resume banner (session was abandoned/soft-deleted)
    await expect(page.locator(".resume-banner")).not.toBeVisible();
  });

  test("can start new session after abandoning", async ({ page }) => {
    // Start first session
    const firstSessionId = await startSession(page);

    // Abandon
    await abandonSession(page);

    // Navigate back to new session screen and start new session
    await goToNewSession(page);
    const secondSessionId = await startSession(page);

    // Should be a different session
    expect(secondSessionId).not.toBe(firstSessionId);
    expect(secondSessionId).not.toBeNull();
  });

  test("reset also cleans up session properly", async ({ page }) => {
    // Complete a full session
    await startSession(page);
    await goToCoding(page);
    await submitSolution(page);
    await goToReflection(page);
    await completeReflection(page);

    // Verify we're on done screen
    let state = await getAppState(page);
    expect(state.screen).toBe("done");

    // Use reset (not abandon) from done screen
    await page.evaluate(() => {
      window.IDS.resetApp();
      window.IDS.router.navigate("/");
    });
    await waitForScreen(page, "dashboard");

    state = await getAppState(page);
    expect(state.screen).toBe("dashboard");
    expect(state.sessionId).toBeNull();
  });
});
