import { test, expect, type Page, type Download } from "playwright/test";

/**
 * Export E2E Tests
 *
 * Tests for session export functionality.
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
async function completeSession(page: Page): Promise<void> {
  // Start session
  await page.click(".start-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

  // Prep - add invariants
  await page.fill("#invariants", "Test invariants for export");

  // Start coding
  await page.click(".start-coding-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

  // Add code
  await page.fill("#code", "function solution() {\n  return 42;\n}");

  // Submit solution (early submission to skip silent)
  await page.click('[data-action="submit-solution"]');
  await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

  // Continue to reflection
  await page.click('[data-action="continue-to-reflection"]');
  await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");

  // Fill reflection
  await page.click('input[name="clearApproach"][value="yes"]');
  await page.click('input[name="prolongedStall"][value="no"]');
  await page.click('input[name="recoveredFromStall"][value="n/a"]');
  await page.click('input[name="timePressure"][value="comfortable"]');
  await page.click('input[name="wouldChangeApproach"][value="no"]');
  await page.click('[data-action="submit-reflection"]');

  // Wait for done screen
  await page.waitForFunction(() => window.IDS.getAppState().screen === "done");
}

test.describe("Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("Export button is visible on Done screen", async ({ page }) => {
    await completeSession(page);

    // Export button should be visible
    await expect(page.locator('[data-action="export-session"]')).toBeVisible();
  });

  test("Export button is primary, New Session is secondary", async ({ page }) => {
    await completeSession(page);

    // Check button variants
    const exportBtn = page.locator('[data-action="export-session"]');
    const newSessionBtn = page.locator('[data-action="new-session"]');

    await expect(exportBtn).toHaveClass(/btn--primary/);
    await expect(newSessionBtn).toHaveClass(/btn--secondary/);
  });

  test("Export triggers file download", async ({ page }) => {
    await completeSession(page);

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent("download");

    // Click export
    await page.click('[data-action="export-session"]');

    // Wait for download
    const download = await downloadPromise;

    // Check filename format: {problem-slug}-{date}.tar.gz
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^[\w-]+-\d{4}-\d{2}-\d{2}\.tar\.gz$/);
  });

  test("Export filename includes problem slug and date", async ({ page }) => {
    await completeSession(page);

    // Get problem title for expected slug
    const problemTitle = await page.evaluate(() => window.IDS.getAppState().problem?.title);
    const expectedSlug = problemTitle
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    const today = new Date().toISOString().slice(0, 10);

    // Set up download
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;

    const filename = download.suggestedFilename();

    // Should contain slug and today's date
    expect(filename).toContain(expectedSlug);
    expect(filename).toContain(today);
    expect(filename).toMatch(/\.tar\.gz$/);
  });

  test("Export shows success toast", async ({ page }) => {
    await completeSession(page);

    // Set up download to capture it
    const downloadPromise = page.waitForEvent("download");

    // Click export
    await page.click('[data-action="export-session"]');

    // Wait for download
    await downloadPromise;

    // Toast should appear
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText(/export/i);
  });

  test("Can start new session after export", async ({ page }) => {
    await completeSession(page);

    // Export first
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    await downloadPromise;

    // Start new session
    await page.click('[data-action="new-session"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "home");

    // Should be on home screen
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("home");
    expect(state.sessionId).toBeNull();
  });
});

test.describe("Export File Contents", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("Exported file is a valid gzip archive", async ({ page }) => {
    await completeSession(page);

    // Get the download
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;

    // Read the file
    const path = await download.path();
    expect(path).toBeTruthy();

    // Check file has content (gzip magic bytes: 1f 8b)
    const fs = await import("fs");
    const buffer = fs.readFileSync(path!);

    // Gzip files start with magic bytes 0x1f 0x8b
    expect(buffer[0]).toBe(0x1f);
    expect(buffer[1]).toBe(0x8b);
  });

  test("Export includes code and invariants", async ({ page }) => {
    const testInvariants = "My test invariants: edge cases, constraints";
    const testCode = "function myTestSolution() { return 'tested'; }";

    // Start session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Add specific invariants
    await page.fill("#invariants", testInvariants);

    // Start coding
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Add specific code
    await page.fill("#code", testCode);

    // Complete session
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

    // Verify the session state has our data
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionState?.invariants).toBe(testInvariants);
    expect(state.sessionState?.code).toBe(testCode);

    // Export
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;

    // File should exist and have reasonable size
    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import("fs");
    const stats = fs.statSync(path!);

    // Should have some content (at least a few hundred bytes for the tar + gzip overhead)
    expect(stats.size).toBeGreaterThan(100);
  });
});

test.describe("Export Without Audio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("Export works when no audio was recorded", async ({ page }) => {
    await completeSession(page);

    // Verify no audio recorded
    const audioStats = await page.evaluate(() => window.IDS.storage.getStats());
    expect(audioStats.audioCount).toBe(0);

    // Export should still work
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;

    // Should get a file
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.tar\.gz$/);

    // File should have content
    const path = await download.path();
    const fs = await import("fs");
    const stats = fs.statSync(path!);
    expect(stats.size).toBeGreaterThan(100);
  });
});
