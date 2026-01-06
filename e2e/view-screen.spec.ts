import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  completeFullSession,
  startSession,
  goToCoding,
  waitForScreen,
  getAppState,
} from "./_helpers";

/**
 * ViewScreen E2E Tests
 *
 * Tests for the read-only session view at #/:id/view
 */

test.describe("ViewScreen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearStorage(page);
  });

  test("displays completed session with problem title, code, and invariants", async ({ page }) => {
    // Complete a full session with some content
    await goToNewSession(page);
    const sessionId = await completeFullSession(page, {
      invariants: "Use a hash map for O(1) lookup",
      code: "def two_sum(nums, target):\n  seen = {}\n  for i, n in enumerate(nums):\n    if target - n in seen:\n      return [seen[target - n], i]\n    seen[n] = i",
    });

    // Navigate to view screen
    await page.goto(`/#/${sessionId}/view`);
    await page.waitForSelector(".view-screen");

    // Verify problem title is displayed
    await expect(page.locator(".view-screen__title")).toBeVisible();

    // Verify "Completed" badge is shown (use text selector to avoid matching difficulty badge)
    await expect(page.locator("text=Completed")).toBeVisible();

    // Verify code is displayed
    await expect(page.locator(".view-screen__code")).toContainText("def two_sum");

    // Verify invariants are displayed
    await expect(page.locator(".view-screen__invariants")).toContainText("hash map");
  });

  test("redirects to SessionScreen when viewing in-progress session", async ({ page }) => {
    // Start a session but don't complete it
    await goToNewSession(page);
    const sessionId = await startSession(page);

    // Try to navigate to the view screen
    await page.goto(`/#/${sessionId}/view`);

    // Should redirect to session screen (prep phase)
    await page.waitForFunction((id) => window.location.hash === `#/${id}`, sessionId, {
      timeout: 5000,
    });

    // Verify we're on the session screen (prep)
    const state = await getAppState(page);
    expect(state.screen).toBe("prep");
  });

  test("redirects to dashboard with error toast when session not found", async ({ page }) => {
    // Navigate to a non-existent session view
    await page.goto("/#/non-existent-session-id/view");

    // Should redirect to dashboard
    await page.waitForFunction(
      () => window.location.hash === "#/" || window.location.hash === "",
      undefined,
      { timeout: 5000 },
    );

    // Verify error toast was shown
    await expect(page.locator(".toast--error")).toBeVisible();
    await expect(page.locator(".toast--error")).toContainText("Session not found");
  });

  test("export button triggers download", async ({ page }) => {
    // Complete a full session
    await goToNewSession(page);
    const sessionId = await completeFullSession(page, {
      code: "def solution(): pass",
    });

    // Navigate to view screen
    await page.goto(`/#/${sessionId}/view`);
    await page.waitForSelector(".view-screen");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click export button
    await page.click('button:has-text("Export Session")');

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename contains expected pattern
    expect(download.suggestedFilename()).toMatch(/\.tar\.gz$/);
  });

  test("shows placeholder when no code was written", async ({ page }) => {
    // Complete a session without writing code
    await goToNewSession(page);
    const sessionId = await startSession(page);

    // Skip directly to coding and submit without writing code
    await goToCoding(page);
    await page.click('button:has-text("Submit Solution")');
    await waitForScreen(page, "summary");
    await page.click('button:has-text("Continue to Reflection")');
    await waitForScreen(page, "reflection");

    // Complete reflection
    await page.click('input[name="clearApproach"][value="yes"]');
    await page.click('input[name="prolongedStall"][value="no"]');
    await page.click('input[name="recoveredFromStall"][value="n/a"]');
    await page.click('input[name="timePressure"][value="comfortable"]');
    await page.click('input[name="wouldChangeApproach"][value="no"]');
    await page.click('button:has-text("Submit Reflection")');
    await waitForScreen(page, "done");

    // Navigate to view screen
    await page.goto(`/#/${sessionId}/view`);
    await page.waitForSelector(".view-screen");

    // Verify empty placeholder is shown for code (the page contains this text somewhere)
    await expect(page.locator("text=No code written")).toBeVisible();
  });

  test("back to dashboard button navigates correctly", async ({ page }) => {
    // Complete a full session
    await goToNewSession(page);
    const sessionId = await completeFullSession(page);

    // Navigate to view screen
    await page.goto(`/#/${sessionId}/view`);
    await page.waitForSelector(".view-screen");

    // Wait for the actions section to be visible
    await page.waitForSelector(".view-screen__actions");

    // Click back to dashboard
    await page.click('button:has-text("Back to Dashboard")');

    // Verify we're on dashboard
    await page.waitForFunction(
      () => window.location.hash === "#/" || window.location.hash === "",
      undefined,
      { timeout: 5000 },
    );
  });
});
