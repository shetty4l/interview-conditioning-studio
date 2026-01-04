import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  goToDashboard,
  startSession,
  goToCoding,
  abandonSession,
  getAppState,
  updateCode,
  completeFullSession,
  waitForSessionPersisted,
} from "./_helpers";

/**
 * Dashboard E2E Tests
 *
 * Tests for dashboard functionality including:
 * - Session list display
 * - Stats calculation
 * - Navigation and routing
 * - Session management (soft delete)
 *
 * Edge cases covered:
 * - #5: Dashboard nav with active session
 * - #6: Abandoned sessions (soft delete, hidden)
 * - #7: New session while one active
 * - #9: Empty stats calculation
 * - #15: Direct URL to non-existent session
 * - #16: Direct URL to deleted session
 */

/**
 * Helper to wait for dashboard to fully load.
 */
async function waitForDashboardLoaded(page: import("playwright/test").Page): Promise<void> {
  // Wait for either the empty state or the session list to be visible
  await page.waitForSelector(".dashboard__empty, .dashboard__list", { timeout: 10000 });
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  // Edge case #9: Empty stats calculation - return zeros, no division error
  test("should show empty state with zero stats when no sessions exist", async ({ page }) => {
    // Navigate to dashboard
    await goToDashboard(page);
    await waitForDashboardLoaded(page);

    // Should show empty state
    await expect(page.getByText("No sessions yet")).toBeVisible();

    // Stats should show zeros (dashboard__stats contains StatsCard components)
    await expect(page.locator(".dashboard__stats")).toContainText("0");
  });

  // Edge case #6: Abandoned sessions - soft delete, hidden from UI
  test("should show completed sessions in list", async ({ page }) => {
    // Complete a session
    await goToNewSession(page);
    await completeFullSession(page);

    // Go back to dashboard
    await goToDashboard(page);
    await waitForDashboardLoaded(page);

    // Session should appear in list
    await expect(page.locator(".session-card")).toHaveCount(1);
    // Use more specific selector to avoid matching stats card
    await expect(page.locator(".session-card__status--completed")).toBeVisible();
  });

  // Edge case #6: Abandoned sessions - soft delete, hidden from UI
  test("should hide abandoned sessions from list (soft delete)", async ({ page }) => {
    // Start a session
    await goToNewSession(page);
    await startSession(page);

    // Abandon it
    await abandonSession(page);

    // Navigate to dashboard
    await goToDashboard(page);
    await waitForDashboardLoaded(page);

    // Abandoned session should NOT appear in list (deleted)
    await expect(page.locator(".session-card")).toHaveCount(0);
    await expect(page.getByText("No sessions yet")).toBeVisible();
  });

  // Edge case #5: Dashboard nav with active session - warn but allow, auto-save
  test("should allow navigation to dashboard from active session via URL", async ({ page }) => {
    // Start a session
    await goToNewSession(page);
    const sessionId = await startSession(page);
    await waitForSessionPersisted(page, sessionId);

    // Navigate to dashboard via URL (session screens don't have header nav link)
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for dashboard to load
    await page.waitForSelector('button:has-text("New Session")', { timeout: 10000 });
    await waitForDashboardLoaded(page);

    // Session should still be resumable (in-progress)
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  });

  // Edge case #7: New session while one active - show resume banner
  test("should show resume banner when navigating to new session with active session", async ({
    page,
  }) => {
    // Start a session
    await goToNewSession(page);
    const sessionId = await startSession(page);
    await waitForSessionPersisted(page, sessionId);

    // Reset app state but keep storage, then navigate to new session
    // This simulates opening a new tab to start another session
    await page.evaluate(() => window.IDS.resetApp());
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.waitForSelector('button:has-text("Start Session")', { timeout: 10000 });

    // Should show resume banner for existing session
    await expect(page.locator(".resume-banner")).toBeVisible();
    await expect(page.getByText("Continue Previous Session")).toBeVisible();
  });

  // Edge case #15: Direct URL to non-existent session - redirect + toast
  test("should redirect to dashboard with toast for non-existent session", async ({ page }) => {
    // Navigate to a fake session ID
    await page.goto("/#/nonexistent123");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to dashboard (session not found triggers redirect)
    await page.waitForFunction(
      () => {
        const hash = window.location.hash;
        return hash === "#/" || hash === "" || hash === "#";
      },
      undefined,
      { timeout: 5000 },
    );

    // Should show "Session not found" toast
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText(/not found/i);
  });

  // Edge case #16: Direct URL to deleted session - redirect + toast
  test("should redirect to dashboard with toast for deleted session", async ({ page }) => {
    // Complete a session
    await goToNewSession(page);
    const sessionId = await completeFullSession(page);

    // Soft delete the session via storage API
    await page.evaluate((id) => window.IDS.storage.softDeleteSession(id), sessionId);

    // Navigate back to dashboard first
    await goToDashboard(page);
    await waitForDashboardLoaded(page);

    // Now try to access the deleted session directly
    await page.goto(`/#/${sessionId}`);
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should redirect to dashboard
    await page.waitForFunction(
      () => {
        const hash = window.location.hash;
        return hash === "#/" || hash === "" || hash === "#";
      },
      undefined,
      { timeout: 5000 },
    );

    // Should show "Session not found" toast
    await expect(page.locator(".toast")).toBeVisible();
  });

  // Additional: Resume in-progress session from dashboard
  test("should allow resuming in-progress session from dashboard", async ({ page }) => {
    // Start a session and go to coding
    await goToNewSession(page);
    const sessionId = await startSession(page);
    await goToCoding(page);
    await updateCode(page, "function test() {}");
    await waitForSessionPersisted(page, sessionId);

    // Navigate to dashboard
    await goToDashboard(page);
    await waitForDashboardLoaded(page);

    // Should show in-progress session with Resume button
    await expect(page.locator(".session-card")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

    // Click resume
    await page.click('button:has-text("Resume")');

    // Should navigate to the session and restore state
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);
    const state = await getAppState(page);
    expect(state.sessionId).toBe(sessionId);
    expect(state.screen).toBe("coding");
  });
});
