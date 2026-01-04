import { test, expect } from "playwright/test";
import {
  clearStorage,
  goToNewSession,
  startSession,
  goToCoding,
  submitSolution,
  goToReflection,
  completeReflection,
  getAppState,
  updateCode,
  updateInvariants,
} from "./_helpers";

/**
 * Early Submission E2E Tests
 *
 * Tests for the "Submit Solution" feature that allows
 * skipping the Silent phase and going directly to Summary.
 */

test.describe("Early Submission", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorage(page);
  });

  test("Submit Solution button is visible in CODING phase", async ({ page }) => {
    // Start a session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Submit button should be visible
    await expect(page.getByRole("button", { name: "Submit Solution" })).toBeVisible();
  });

  test("Submit Solution skips Silent phase and goes to Summary", async ({ page }) => {
    // Start a session
    await goToNewSession(page);
    await startSession(page);

    // Write some invariants
    await updateInvariants(page, "Test invariants for early submission");

    // Go to coding
    await goToCoding(page);

    // Write some code
    await updateCode(page, "function solution() { return 42; }");

    // Submit solution early
    await submitSolution(page);

    // Should go directly to Summary, skipping Silent
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
    expect(state.phase).toBe("SUMMARY");
  });

  test("Early submission preserves code and invariants", async ({ page }) => {
    const invariantsText = "My approach: use dynamic programming";
    const codeText = "function dp(n) {\n  return n * 2;\n}";

    // Start a session
    await goToNewSession(page);
    await startSession(page);

    // Write invariants
    await updateInvariants(page, invariantsText);

    // Go to coding
    await goToCoding(page);

    // Write code
    await updateCode(page, codeText);

    // Submit solution
    await submitSolution(page);

    // Verify state preserved
    const state = await getAppState(page);
    expect(state.invariants).toBe(invariantsText);
    expect(state.code).toBe(codeText);
  });

  test("Early submission records correct event in log", async ({ page }) => {
    // Start session and go to coding
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Submit solution
    await submitSolution(page);

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
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);
    await submitSolution(page);

    // Continue to reflection
    await goToReflection(page);

    const state = await getAppState(page);
    expect(state.screen).toBe("reflection");
    expect(state.phase).toBe("REFLECTION");
  });

  test("Full early submission flow: Home → Prep → Coding → Summary → Reflection → Done", async ({
    page,
  }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Prep phase - add invariants
    await updateInvariants(page, "Early submission test");
    await goToCoding(page);

    // Coding phase - submit early
    await updateCode(page, "console.log('done');");
    await submitSolution(page);

    // Summary - continue
    await goToReflection(page);

    // Reflection - fill and submit
    await completeReflection(page);

    // Should be at Done
    const state = await getAppState(page);
    expect(state.screen).toBe("done");
    expect(state.phase).toBe("DONE");
  });

  test("URL stays consistent through early submission", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    const sessionId = await startSession(page);

    await goToCoding(page);

    // Verify URL is session-based (no phase in URL)
    expect(page.url()).toContain(`#/${sessionId}`);

    // Submit solution
    await submitSolution(page);

    // URL should still be session-based
    expect(page.url()).toContain(`#/${sessionId}`);

    // But state.screen should be summary
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
  });
});
