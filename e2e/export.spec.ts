import { test, expect, type Page } from "playwright/test";
import * as fs from "fs";
import * as zlib from "zlib";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  submitSolution,
  goToReflection,
  completeReflection,
  waitForScreen,
  getAppState,
  updateCode,
  updateInvariants,
} from "./_helpers";

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
    // eslint-disable-next-line no-control-regex
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

// Helper to complete a session (using the helpers pattern)
async function completeSession(page: Page): Promise<void> {
  await goToNewSession(page);

  // Start session
  await startSession(page);

  // Prep - add invariants
  await updateInvariants(page, "Test invariants for export");

  // Start coding
  await goToCoding(page);

  // Add code
  await updateCode(page, "function solution() {\n  return 42;\n}");

  // Submit solution (early submission to skip silent)
  await submitSolution(page);

  // Continue to reflection
  await goToReflection(page);

  // Complete reflection
  await completeReflection(page);
}

test.describe("Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
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

    // Wait for HomeScreen to load (Start Session button visible)
    await page.waitForSelector('button:has-text("Start Session")', { timeout: 10000 });

    // Should be on home screen (URL is #/new, no session active)
    const state = await getAppState(page);
    expect(state.sessionId).toBeNull();
    expect(page.url()).toContain("#/new");
  });
});

test.describe("Export File Contents", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
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

    await goToNewSession(page);

    // Start session
    await startSession(page);

    // Add specific invariants
    await updateInvariants(page, testInvariants);

    // Start coding
    await goToCoding(page);

    // Add specific code
    await updateCode(page, testCode);

    // Complete session
    await submitSolution(page);
    await goToReflection(page);
    await completeReflection(page);

    // Verify the session state has our data
    const state = await getAppState(page);
    expect(state.invariants).toBe(testInvariants);
    expect(state.code).toBe(testCode);

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
    await clearStorage(page);
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
    await clearStorage(page);
  });

  test("code.txt contains the actual code written", async ({ page }) => {
    const testCode = "function solution(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}";

    await goToNewSession(page);
    await startSession(page);
    await updateInvariants(page, "test invariants");

    // Start coding and write specific code
    await goToCoding(page);
    await updateCode(page, testCode);

    // Complete session quickly
    await submitSolution(page);
    await goToReflection(page);
    await completeReflection(page);

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["code.txt"]).toBe(testCode);
  });

  test("invariants.txt contains the actual invariants written", async ({ page }) => {
    const testInvariants = "Edge cases:\n- empty array\n- single element\n- negative numbers";

    await goToNewSession(page);
    await startSession(page);
    await updateInvariants(page, testInvariants);

    // Start coding
    await goToCoding(page);
    await updateCode(page, "// some code");

    // Complete session quickly
    await submitSolution(page);
    await goToReflection(page);
    await completeReflection(page);

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["invariants.txt"]).toBe(testInvariants);
  });

  test("session.json has correct structure and data", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await updateInvariants(page, "test");
    await goToCoding(page);
    await updateCode(page, "test code");
    await submitSolution(page);
    await goToReflection(page);

    // Fill reflection with specific values
    await page.click('input[name="clearApproach"][value="partially"]');
    await page.click('input[name="prolongedStall"][value="yes"]');
    await page.click('input[name="recoveredFromStall"][value="yes"]');
    await page.click('input[name="timePressure"][value="manageable"]');
    await page.click('input[name="wouldChangeApproach"][value="yes"]');
    await page.click('button:has-text("Submit Reflection")');
    await waitForScreen(page, "done");

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

  test("export contains exactly 4 files when no audio", async ({ page }) => {
    await completeSession(page);

    // Export and check file list
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    const fileNames = Object.keys(files).sort();
    expect(fileNames).toEqual(["README.md", "code.txt", "invariants.txt", "session.json"]);
  });

  test("empty code exports as empty string", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    await updateInvariants(page, "some invariants");
    await goToCoding(page);
    // Don't fill any code

    // Complete session
    await submitSolution(page);
    await goToReflection(page);

    // Fill reflection with specific values
    await page.click('input[name="clearApproach"][value="no"]');
    await page.click('input[name="prolongedStall"][value="no"]');
    await page.click('input[name="recoveredFromStall"][value="n/a"]');
    await page.click('input[name="timePressure"][value="overwhelming"]');
    await page.click('input[name="wouldChangeApproach"][value="yes"]');
    await page.click('button:has-text("Submit Reflection")');
    await waitForScreen(page, "done");

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["code.txt"]).toBe("");
  });

  test("empty invariants exports as empty string", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);
    // Don't fill invariants
    await goToCoding(page);
    await updateCode(page, "function test() {}");

    // Complete session
    await submitSolution(page);
    await goToReflection(page);
    await completeReflection(page);

    // Export and verify
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    expect(files["invariants.txt"]).toBe("");
  });
});

// ============================================================================
// Phase 3 Edge Cases - Export Tests
// ============================================================================

test.describe("Export - Phase 3 Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  // Edge case #10: Export with no audio - omit audio file from export
  test("should omit audio file from export when no recording exists", async ({ page }) => {
    await completeSession(page);

    // Verify no audio was recorded
    const audioStats = await page.evaluate(() => window.IDS.storage.getStats());
    expect(audioStats.audioCount).toBe(0);

    // Export
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    // Should have exactly 4 files, no audio
    const fileNames = Object.keys(files).sort();
    expect(fileNames).toEqual(["README.md", "code.txt", "invariants.txt", "session.json"]);

    // Specifically verify no audio file exists
    expect(files["audio.webm"]).toBeUndefined();
    expect(files["audio.mp3"]).toBeUndefined();
  });

  // Edge case #11: Export abandoned session - allow
  test.skip("should allow export of abandoned session", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);

    // Add some content
    await updateInvariants(page, "Abandoned session invariants");
    await goToCoding(page);
    await updateCode(page, "function abandonedCode() {}");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Abandon the session (soft delete in Phase 3)
    await page.evaluate(() => window.IDS.abandonSession());

    // Navigate to view the abandoned session (requires SessionViewScreen)
    // Note: This test depends on Phase 3 implementation of view screen
    await page.goto(`/#/${sessionId}/view`);
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Export button should be available
    await expect(page.locator('[data-action="export-session"]')).toBeVisible();

    // Export should work
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-action="export-session"]');
    const download = await downloadPromise;
    const files = extractExport((await download.path())!);

    // Should contain the content we added
    expect(files["invariants.txt"]).toBe("Abandoned session invariants");
    expect(files["code.txt"]).toBe("function abandonedCode() {}");
  });

  // Edge case #12: Export in-progress session - disallow
  test.skip("should not show export button for in-progress session", async ({ page }) => {
    await goToNewSession(page);
    await startSession(page);

    // In PREP phase - no export button
    await expect(page.locator('[data-action="export-session"]')).toHaveCount(0);

    // Go to CODING phase
    await goToCoding(page);

    // In CODING phase - no export button
    await expect(page.locator('[data-action="export-session"]')).toHaveCount(0);

    // Go to SUMMARY phase
    await submitSolution(page);

    // In SUMMARY phase - no export button
    await expect(page.locator('[data-action="export-session"]')).toHaveCount(0);

    // Go to REFLECTION phase
    await goToReflection(page);

    // In REFLECTION phase - no export button
    await expect(page.locator('[data-action="export-session"]')).toHaveCount(0);

    // Complete session
    await completeReflection(page);

    // In DONE phase - export button should be visible
    await expect(page.locator('[data-action="export-session"]')).toBeVisible();
  });
});
