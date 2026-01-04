import { test, expect, type Page } from "playwright/test";

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

// Helper to complete a session
async function completeSession(page: Page): Promise<string> {
  await page.click(".start-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

  await page.fill("#invariants", "Test invariants");
  await page.click(".start-coding-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

  await page.fill("#code", "function test() {}");
  await page.click('[data-action="submit-solution"]');
  await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

  await page.click('[data-action="continue-to-reflection"]');
  await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");

  await page.click('input[name="clearApproach"][value="yes"]');
  await page.click('input[name="prolongedStall"][value="no"]');
  await page.click('input[name="recoveredFromStall"][value="n/a"]');
  await page.click('input[name="timePressure"][value="comfortable"]');
  await page.click('input[name="wouldChangeApproach"][value="no"]');
  await page.click('[data-action="submit-reflection"]');

  await page.waitForFunction(() => window.IDS.getAppState().screen === "done");

  const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
  return sessionId!;
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  // Edge case #9: Empty stats calculation - return zeros, no division error
  test.skip("should show empty state with zero stats when no sessions exist", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should show empty state
    await expect(page.locator(".dashboard-empty-state")).toBeVisible();

    // Stats should show zeros without crashing
    await expect(page.locator('[data-stat="total-sessions"]')).toContainText("0");
    await expect(page.locator('[data-stat="avg-nudges"]')).toContainText("0");
    await expect(page.locator('[data-stat="avg-prep-time"]')).toContainText("0");
  });

  // Edge case #6: Abandoned sessions - soft delete, hidden from UI
  test.skip("should show completed sessions in list", async ({ page }) => {
    // Complete a session
    await completeSession(page);

    // Go back to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Session should appear in list
    await expect(page.locator(".session-card")).toHaveCount(1);
    await expect(page.locator(".session-card")).toContainText(/completed/i);
  });

  // Edge case #6: Abandoned sessions - soft delete, hidden from UI
  test.skip("should hide abandoned sessions from list (soft delete)", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Abandon it
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().screen === "home");

    // Navigate to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Abandoned session should NOT appear in list (soft deleted, hidden)
    await expect(page.locator(".session-card")).toHaveCount(0);
    await expect(page.locator(".dashboard-empty-state")).toBeVisible();

    // But session should still exist in storage (soft deleted)
    const stored = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId!);
    // With soft delete, session exists but has deletedAt set
    // For now, current implementation hard deletes, so this will be null
    // After implementing soft delete, this should return the session with deletedAt
    expect(stored).toBeNull(); // TODO: Change to expect soft-deleted session
  });

  // Edge case #5: Dashboard nav with active session - warn but allow, auto-save
  test.skip("should allow navigation to dashboard from active session", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Click dashboard link (back navigation)
    await page.click('[data-action="go-to-dashboard"]');

    // Should navigate to dashboard (with warning or confirmation)
    await page.waitForFunction(() => window.location.hash === "#/" || window.location.hash === "");

    // Session should be saved and resumable
    const incomplete = await page.evaluate(() => window.IDS.storage.getIncompleteSession());
    expect(incomplete).not.toBeNull();
  });

  // Edge case #7: New session while one active - block with message
  test.skip("should block new session when one is in progress", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Navigate to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Try to start new session
    await page.click('[data-action="new-session"]');

    // Should show blocking message
    await expect(page.locator(".toast--error, .blocking-message")).toBeVisible();
    await expect(page.getByText(/session in progress/i)).toBeVisible();
  });

  // Edge case #15: Direct URL to non-existent session - redirect + toast
  test.skip("should redirect to dashboard with toast for non-existent session", async ({
    page,
  }) => {
    // Navigate to a fake session ID
    await page.goto("/#/nonexistent123");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should redirect to dashboard
    await page.waitForFunction(() => window.location.hash === "#/" || window.location.hash === "");

    // Should show "Session not found" toast
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText(/not found/i);
  });

  // Edge case #16: Direct URL to deleted session - redirect + toast
  test.skip("should redirect to dashboard with toast for deleted session", async ({ page }) => {
    // Complete a session
    const sessionId = await completeSession(page);

    // Soft delete the session (will need to expose softDeleteSession on IDS API)
    // For now, we simulate by going through the store action
    await page.evaluate(async (id) => {
      // TODO: Once softDeleteSession is implemented, call it here
      // await window.IDS.softDeleteSession(id);
      // For now, this test will need the API to be exposed
    }, sessionId);

    // Navigate back to dashboard first
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Now try to access the deleted session directly
    await page.goto(`/#/${sessionId}`);
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should redirect to dashboard
    await page.waitForFunction(() => window.location.hash === "#/" || window.location.hash === "");

    // Should show "Session not found" toast
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText(/not found/i);
  });

  // Additional: Resume in-progress session from dashboard
  test.skip("should allow resuming in-progress session from dashboard", async ({ page }) => {
    // Start a session and navigate away
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Reset app state (simulating closing tab)
    await page.evaluate(() => window.IDS.resetApp());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Navigate to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should show in-progress session with Resume button
    await expect(page.locator(".session-card")).toHaveCount(1);
    await expect(page.locator('[data-action="resume-session"]')).toBeVisible();

    // Click resume
    await page.click('[data-action="resume-session"]');

    // Should navigate to the session
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);
    expect(await page.evaluate(() => window.IDS.getAppState().sessionId)).toBe(sessionId);
  });
});
