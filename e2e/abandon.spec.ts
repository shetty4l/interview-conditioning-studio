import { test, expect, type Page } from "playwright/test";

/**
 * Abandon Session E2E Tests
 *
 * Tests for abandoning an in-progress session.
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

// Helper to wait for session to be persisted
async function waitForSessionPersisted(page: Page, sessionId: string, timeout = 5000) {
  await page.waitForFunction(
    (id) => {
      return window.IDS.storage.getSession(id).then((session: unknown) => session !== null);
    },
    sessionId,
    { timeout },
  );
}

test.describe("Abandon Session", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("abandonSession clears session state", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    expect(sessionId).not.toBeNull();

    // Abandon session via API
    await page.evaluate(() => window.IDS.abandonSession());

    // Wait for state to reset
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionId).toBeNull();
    expect(state.session).toBeNull();
    expect(state.screen).toBe("dashboard");
  });

  test("abandonSession deletes session from storage", async ({ page }) => {
    // Start a session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Verify session exists in storage
    let storedSession = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId!);
    expect(storedSession).not.toBeNull();

    // Abandon
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Verify session deleted from storage
    storedSession = await page.evaluate((id) => window.IDS.storage.getSession(id), sessionId!);
    expect(storedSession).toBeNull();
  });

  test("abandonSession navigates to dashboard", async ({ page }) => {
    // Start a session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // Abandon
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().screen === "dashboard");

    // Should be at dashboard
    expect(page.url()).toMatch(/#\/?$/);
  });

  test("can abandon from PREP phase", async ({ page }) => {
    // Start session (lands on prep)
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Abandon from prep
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Verify cleanup
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("dashboard");

    const storedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(storedSession).toBeNull();
  });

  test("can abandon from CODING phase", async ({ page }) => {
    // Start session and go to coding
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Abandon from coding
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Verify cleanup
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("dashboard");
  });

  test("can abandon from SUMMARY phase", async ({ page }) => {
    // Start session and go through to summary
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Abandon from summary
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Verify cleanup
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("dashboard");
  });

  test("can abandon from REFLECTION phase", async ({ page }) => {
    // Start session and go through to reflection
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    await page.click('[data-action="submit-solution"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "summary");

    await page.click('[data-action="continue-to-reflection"]');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "reflection");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Abandon from reflection
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Verify cleanup
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("dashboard");
  });

  test("abandoned session does not show in resume banner", async ({ page }) => {
    // Start session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Abandon session
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Navigate to new session screen
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should not show resume banner
    await expect(page.locator(".resume-banner")).not.toBeVisible();
  });

  test("can start new session after abandoning", async ({ page }) => {
    // Start first session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const firstSessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Abandon
    await page.evaluate(() => window.IDS.abandonSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Navigate back to new session screen and start new session
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const secondSessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Should be a different session
    expect(secondSessionId).not.toBe(firstSessionId);
    expect(secondSessionId).not.toBeNull();
  });

  test("reset also cleans up session properly", async ({ page }) => {
    // Start a completed session
    await page.click(".start-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");

    await page.click(".start-coding-button");
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

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

    // Use reset (not abandon) from done screen
    await page.evaluate(() => window.IDS.resetApp());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("dashboard");
    expect(state.session).toBeNull();
  });
});
