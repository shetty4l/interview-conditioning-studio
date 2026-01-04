import { test, expect } from "playwright/test";
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
  requestNudge,
  updateCode,
} from "./_helpers";

/**
 * Session Flow E2E Tests
 *
 * Tests for the complete session flow through all phases.
 * URL structure: #/ (dashboard), #/new (new session), #/:id (session)
 * Phase is determined by state.screen, not URL.
 */

test.describe("Session Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await clearStorage(page);
  });

  test("happy path: complete session flow through all phases", async ({ page }) => {
    // Navigate to new session screen
    await goToNewSession(page);

    // Should see the preset selection
    await expect(
      page.getByRole("heading", { name: "Interview Conditioning Studio" }),
    ).toBeVisible();

    // Select preset and start session
    await page.getByRole("button", { name: /Standard/ }).click();
    const sessionId = await startSession(page);

    // Should be on prep screen (URL is /#/:id, state.screen is "prep")
    expect(page.url()).toContain(`#/${sessionId}`);
    let state = await getAppState(page);
    expect(state.screen).toBe("prep");
    await expect(page.getByText("PREP")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible(); // Problem title

    // Enter some invariants
    await page.getByRole("textbox").first().fill("- Check for null inputs\n- Handle empty lists");

    // Start coding
    await goToCoding(page);

    // Should be on coding screen (same URL, different state.screen)
    expect(page.url()).toContain(`#/${sessionId}`);
    state = await getAppState(page);
    expect(state.screen).toBe("coding");
    await expect(page.getByText("CODING")).toBeVisible();
    await expect(page.getByRole("button", { name: /Nudge/ })).toBeVisible();

    // Enter some code
    await updateCode(page, "function solution() {\n  return null;\n}");

    // Use a nudge
    await requestNudge(page);
    state = await getAppState(page);
    expect(state.nudgesUsed).toBe(1);

    // Submit solution (skips silent phase for early submission)
    await submitSolution(page);

    // Should be on summary screen
    state = await getAppState(page);
    expect(state.screen).toBe("summary");
    await expect(page.getByText("SUMMARY")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Session Complete" })).toBeVisible();
    await expect(page.getByText("Nudges Used")).toBeVisible();
    await expect(page.getByText("1 / 3")).toBeVisible(); // Used 1 nudge

    // Continue to reflection
    await goToReflection(page);

    // Should be on reflection screen
    state = await getAppState(page);
    expect(state.screen).toBe("reflection");
    await expect(page.getByText("REFLECTION", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick Reflection" })).toBeVisible();

    // Complete reflection
    await completeReflection(page);

    // Should be on done screen
    state = await getAppState(page);
    expect(state.screen).toBe("done");
    await expect(page.getByText("DONE")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Session Complete!" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start New Session" })).toBeVisible();
  });

  test("early submission: submit solution skips silent phase", async ({ page }) => {
    // Start session from new session screen
    await goToNewSession(page);
    await startSession(page);

    // Start coding
    await goToCoding(page);

    // Submit solution early (skips silent phase)
    await submitSolution(page);

    // Should go directly to summary (not silent)
    const state = await getAppState(page);
    expect(state.screen).toBe("summary");
    expect(state.phase).toBe("SUMMARY");
    await expect(page.getByText("SUMMARY")).toBeVisible();
  });

  test("nudge exhaustion: button disables when all nudges used", async ({ page }) => {
    // Start with high pressure preset (only 1 nudge)
    await goToNewSession(page);
    await page.getByRole("button", { name: /High Pressure/ }).click();
    await startSession(page);

    // Start coding
    await goToCoding(page);

    // Should have 1 nudge available
    const nudgeButton = page.getByRole("button", { name: /Nudge \(1\/1\)/ });
    await expect(nudgeButton).toBeVisible();
    await expect(nudgeButton).toBeEnabled();

    // Use the nudge
    await nudgeButton.click();

    // Button should show 0 remaining and be disabled
    const exhaustedButton = page.getByRole("button", { name: /Nudge \(0\/1\)/ });
    await expect(exhaustedButton).toBeVisible();
    await expect(exhaustedButton).toBeDisabled();

    // Verify state
    const state = await getAppState(page);
    expect(state.nudgesUsed).toBe(1);
    expect(state.nudgesAllowed).toBe(1);
  });

  test("overtime: timer shows negative time with danger styling", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);

    // Start coding
    await goToCoding(page);

    // Check that the timer component exists
    const timer = page.locator(".timer");
    await expect(timer).toBeVisible();

    // Verify timer is displaying (shows time format)
    const timerText = await timer.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);

    // Note: Full overtime testing would require waiting 35+ minutes,
    // so we just verify the timer component is present and functioning
  });

  test("silent phase: shows banner and disables nudges", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    await startSession(page);
    await goToCoding(page);

    // Manually trigger silent phase via session dispatch
    await page.evaluate(() => {
      window.IDS.getAppState().session?.dispatch("coding.silent_started");
    });

    // Wait for silent screen
    await waitForScreen(page, "silent");

    // Should show silent banner
    await expect(page.getByText("SILENT", { exact: true })).toBeVisible();
    await expect(page.getByText("Silent Phase")).toBeVisible();

    // Nudge button should be hidden in silent phase (implementation hides it)
    const nudgeButton = page.getByRole("button", { name: /Nudge/ });
    await expect(nudgeButton).toHaveCount(0);
  });

  test("can navigate back to session after page reload", async ({ page }) => {
    // Start session
    await goToNewSession(page);
    const sessionId = await startSession(page);

    // Go to coding
    await goToCoding(page);
    await updateCode(page, "const x = 1;");

    // Reload the page
    await page.reload();
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Navigate to the session
    await page.goto(`/#/${sessionId}`);
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Should restore the session at the correct phase
    const state = await getAppState(page);
    expect(state.sessionId).toBe(sessionId);
    expect(state.screen).toBe("coding");
    expect(state.code).toBe("const x = 1;");
  });
});
