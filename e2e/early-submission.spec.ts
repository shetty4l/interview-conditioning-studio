import { test, expect, type Page } from "playwright/test";

/**
 * Early Submission E2E Tests
 *
 * Tests for the "Submit Solution" feature that allows
 * skipping the Silent phase and going directly to Summary.
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

test.describe("Early Submission", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("Submit Solution button is visible in CODING phase", async ({ page }) => {
    // Start a session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Submit button should be visible
    await expect(page.locator('[data-action="submit-solution"]')).toBeVisible();
  });

  test("Submit Solution skips Silent phase and goes to Summary", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Write some invariants
    await page.fill("#invariants", "Test invariants for early submission");

    // Go to coding
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Write some code
    await page.fill("#code", "function solution() { return 42; }");

    // Submit solution early
    await page.click('[data-action="submit-solution"]');

    // Should go directly to Summary, skipping Silent
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Verify we're in Summary phase
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("summary");
    expect(state.sessionState?.phase).toBe("SUMMARY");
  });

  test("Early submission preserves code and invariants", async ({ page }) => {
    const invariantsText = "My approach: use dynamic programming";
    const codeText = "function dp(n) {\n  return n * 2;\n}";

    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Write invariants
    await page.fill("#invariants", invariantsText);

    // Go to coding
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Write code
    await page.fill("#code", codeText);

    // Submit solution
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Verify state preserved
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionState?.invariants).toBe(invariantsText);
    expect(state.sessionState?.code).toBe(codeText);
  });

  test("Early submission records correct event in log", async ({ page }) => {
    // Start session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Submit solution
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Check event log
    const events = await page.evaluate(() =>
      window.IDS.getAppState()
        .session?.getEvents()
        .map((e: { type: string }) => e.type),
    );

    expect(events).toContain("coding.solution_submitted");
    // Should NOT contain silent phase events
    expect(events).not.toContain("coding.silent_started");
    expect(events).not.toContain("silent.ended");
  });

  test("Can continue to Reflection after early submission", async ({ page }) => {
    // Start session and submit early
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Continue to reflection
    await page.click('[data-action="continue-to-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");

    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("reflection");
    expect(state.sessionState?.phase).toBe("REFLECTION");
  });

  test("Full early submission flow: Home → Prep → Coding → Summary → Reflection → Done", async ({
    page,
  }) => {
    // Start session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    // Prep phase
    await page.fill("#invariants", "Early submission test");
    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Coding phase - submit early
    await page.fill("#code", "console.log('done');");
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Summary - continue
    await page.click('[data-action="continue-to-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");

    // Reflection - fill and submit
    await page.click('input[name="clearApproach"][value="yes"]');
    await page.click('input[name="prolongedStall"][value="no"]');
    await page.click('input[name="recoveredFromStall"][value="n/a"]');
    await page.click('input[name="timePressure"][value="comfortable"]');
    await page.click('input[name="wouldChangeApproach"][value="no"]');
    await page.click('[data-action="submit-reflection"]');

    // Should be at Done
    await page.waitForFunction(() => window.IDS.getAppState().screen === "done");

    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("done");
    expect(state.sessionState?.phase).toBe("DONE");
    expect(state.sessionState?.status).toBe("completed");
  });

  test("URL updates correctly on early submission", async ({ page }) => {
    // Start session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Verify coding URL
    expect(page.url()).toContain("/coding");

    // Submit solution
    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    // Verify summary URL (skipped silent)
    expect(page.url()).toContain("/summary");
    expect(page.url()).not.toContain("/silent");
  });
});
