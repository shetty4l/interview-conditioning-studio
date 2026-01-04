import { test, expect, type Page } from "playwright/test";
import * as fs from "fs";
import * as zlib from "zlib";

/**
 * Export E2E Tests
 *
 * Tests for session export functionality.
 */

// ============================================================================
// TAR Parsing Helpers
// ============================================================================

/**
 * Parse a TAR archive and extract file contents.
 * Returns a map of filename -> content string.
 */
function parseTar(tarData: Buffer): Record<string, string> {
  const BLOCK_SIZE = 512;
  const files: Record<string, string> = {};
  let offset = 0;

  while (offset < tarData.length) {
    const header = tarData.subarray(offset, offset + BLOCK_SIZE);

    // End of archive (empty block)
    if (header.every((b) => b === 0)) break;

    // Filename: bytes 0-99, null-terminated
    let nameEnd = header.indexOf(0);
    if (nameEnd < 0 || nameEnd > 100) nameEnd = 100;
    const name = header.subarray(0, nameEnd).toString("utf8");

    // File size: bytes 124-135, octal string null-terminated
    const sizeStr = header.subarray(124, 135).toString("utf8").replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    offset += BLOCK_SIZE;

    // Read file content
    if (size > 0 && name) {
      const content = tarData.subarray(offset, offset + size);
      files[name] = content.toString("utf8");

      // Advance to next 512-byte boundary
      offset += Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
    } else if (name) {
      // Empty file
      files[name] = "";
    }
  }

  return files;
}

/**
 * Extract tar.gz export and return parsed files.
 */
function extractExport(downloadPath: string): Record<string, string> {
  const gzipped = fs.readFileSync(downloadPath);
  const tarData = zlib.gunzipSync(gzipped);
  return parseTar(tarData);
}

// ============================================================================
// Test Helpers
// ============================================================================

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

    // Toast should appear with export message
    await expect(page.locator(".toast--success")).toBeVisible();
    await expect(page.locator(".toast--success")).toContainText(/export/i);
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

    // Export and verify actual file contents
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;

    const path = await download.path();
    expect(path).toBeTruthy();

    // Extract and verify contents
    const files = extractExport(path!);
    expect(files["code.txt"]).toBe(testCode);
    expect(files["invariants.txt"]).toBe(testInvariants);
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
    const stats = fs.statSync(path!);
    expect(stats.size).toBeGreaterThan(100);
  });
});

// ============================================================================
// Export Contents Verification (Comprehensive)
// ============================================================================

test.describe("Export Contents Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("code.txt contains the actual code written", async ({ page }) => {
    const testCode = "function solution(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}";

    // Start session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
    await page.fill("#invariants", "test invariants");

    // Start coding and write specific code
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
    await page.fill("#code", testCode);

    // Complete session quickly
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

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["code.txt"]).toBe(testCode);
  });

  test("invariants.txt contains the actual invariants written", async ({ page }) => {
    const testInvariants = "Edge cases:\n- empty array\n- single element\n- negative numbers";

    // Start session with specific invariants
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
    await page.fill("#invariants", testInvariants);

    // Start coding
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
    await page.fill("#code", "// some code");

    // Complete session quickly
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

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["invariants.txt"]).toBe(testInvariants);
  });

  test("session.json has correct structure and data", async ({ page }) => {
    // Complete session with known reflection values
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
    await page.fill("#invariants", "test");
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
    await page.fill("#code", "test code");
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");
    await page.click('[data-action="continue-to-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");
    await page.click('input[name="clearApproach"][value="partially"]');
    await page.click('input[name="prolongedStall"][value="yes"]');
    await page.click('input[name="recoveredFromStall"][value="yes"]');
    await page.click('input[name="timePressure"][value="manageable"]');
    await page.click('input[name="wouldChangeApproach"][value="yes"]');
    await page.click('[data-action="submit-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "done");

    // Export and verify session.json structure
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    const session = JSON.parse(files["session.json"]);

    // Verify metadata
    expect(session.metadata.version).toBe(1);
    expect(session.metadata.sessionId).toBeTruthy();
    expect(session.metadata.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(session.metadata.problem.id).toBeTruthy();
    expect(session.metadata.problem.title).toBeTruthy();
    expect(session.metadata.problem.description).toBeTruthy();
    expect(session.metadata.preset).toBeTruthy();
    expect(session.metadata.timing.createdAt).toBeTruthy();
    expect(session.metadata.eventCount).toBeGreaterThan(0);

    // Verify events array
    expect(Array.isArray(session.events)).toBe(true);
    expect(session.events.length).toBe(session.metadata.eventCount);
    expect(session.events[0].type).toBe("session.started");
    expect(session.events[session.events.length - 1].type).toBe("session.completed");

    // Verify reflection with specific values we set
    expect(session.reflection).not.toBeNull();
    expect(session.reflection.clearApproach).toBe("partially");
    expect(session.reflection.prolongedStall).toBe("yes");
    expect(session.reflection.recoveredFromStall).toBe("yes");
    expect(session.reflection.timePressure).toBe("manageable");
    expect(session.reflection.wouldChangeApproach).toBe("yes");
  });

  test("export contains exactly 3 files when no audio", async ({ page }) => {
    await completeSession(page);

    // Export and check file list
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    const fileNames = Object.keys(files).sort();
    expect(fileNames).toEqual(["code.txt", "invariants.txt", "session.json"]);
  });

  test("empty code exports as empty string", async ({ page }) => {
    // Start session without writing code
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
    await page.fill("#invariants", "some invariants");
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
    // Don't fill any code

    // Complete session
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");
    await page.click('[data-action="continue-to-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");
    await page.click('input[name="clearApproach"][value="no"]');
    await page.click('input[name="prolongedStall"][value="no"]');
    await page.click('input[name="recoveredFromStall"][value="n/a"]');
    await page.click('input[name="timePressure"][value="overwhelming"]');
    await page.click('input[name="wouldChangeApproach"][value="yes"]');
    await page.click('[data-action="submit-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "done");

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["code.txt"]).toBe("");
  });

  test("empty invariants exports as empty string", async ({ page }) => {
    // Start session without writing invariants
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
    // Don't fill invariants
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
    await page.fill("#code", "function test() {}");

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

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["invariants.txt"]).toBe("");
  });
});
