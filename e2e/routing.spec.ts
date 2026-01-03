import { test, expect } from "playwright/test";

/**
 * Routing E2E Tests
 *
 * Tests for hash-based routing with session ID support.
 */

test.describe("Hash Routing", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for app to initialize before clearing storage
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
  });

  test("parses home route from empty hash", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    const route = await page.evaluate(() => window.IDS.router.getCurrentRoute());
    expect(route.type).toBe("home");
  });

  test("parses home route from #/", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    const route = await page.evaluate(() => window.IDS.router.getCurrentRoute());
    expect(route.type).toBe("home");
  });

  test("parses session route from hash", async ({ page }) => {
    // First create a session
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.evaluate(() => window.IDS.startSession());

    // Wait for session to be created and persisted
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => window.IDS.getAppState());
    const sessionId = state.sessionId;

    // Navigate to the session URL (should restore the session)
    await page.goto(`/?debug=1#/${sessionId}/prep`);
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const route = await page.evaluate(() => window.IDS.router.getCurrentRoute());
    expect(route.type).toBe("session");
    if (route.type === "session") {
      expect(route.sessionId).toBe(sessionId);
      expect(route.phase).toBe("PREP");
    }
  });

  test("updates URL on phase transitions", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Start session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for URL to update
    await page.waitForFunction((id) => window.location.hash.includes(`#/${id}/prep`), sessionId);
    expect(page.url()).toContain(`#/${sessionId}/prep`);

    // Transition to coding
    await page.evaluate(() => window.IDS.startCoding());
    await page.waitForFunction((id) => window.location.hash.includes(`#/${id}/coding`), sessionId);
    expect(page.url()).toContain(`#/${sessionId}/coding`);

    // Submit solution (skip to summary)
    await page.evaluate(() => window.IDS.submitSolution());
    await page.waitForFunction((id) => window.location.hash.includes(`#/${id}/summary`), sessionId);
    expect(page.url()).toContain(`#/${sessionId}/summary`);
  });

  test("redirects to correct phase when URL mismatches session state", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create session and move to coding
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(() => window.IDS.startCoding());
    await page.waitForFunction(() => window.IDS.getAppState().sessionState?.phase === "CODING");

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Try to navigate to prep (wrong phase)
    await page.goto(`/#/${sessionId}/prep`);
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to correct phase
    await page.waitForFunction((id) => window.location.hash.includes(`#/${id}/coding`), sessionId);
    expect(page.url()).toContain(`#/${sessionId}/coding`);
  });

  test("redirects to home when session not found", async ({ page }) => {
    await page.goto("/#/nonexistent123/coding");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to home
    await page.waitForFunction(() => {
      const hash = window.location.hash;
      return hash === "" || hash === "#" || hash === "#/";
    });
    expect(page.url()).toMatch(/\/#?\/?$/);
  });

  test("handles invalid route segments", async ({ page }) => {
    await page.goto("/#/invalid");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to home
    await page.waitForFunction(() => {
      const hash = window.location.hash;
      return hash === "" || hash === "#" || hash === "#/";
    });
    expect(page.url()).toMatch(/\/#?\/?$/);
  });

  test("handles invalid phase in URL", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create a session first
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);
    await page.waitForTimeout(500); // Wait for persist

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Try invalid phase
    await page.goto(`/#/${sessionId}/invalid_phase`);
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to home (invalid phase triggers not_found route)
    await page.waitForFunction(() => {
      const hash = window.location.hash;
      return hash === "" || hash === "#" || hash === "#/";
    });
    expect(page.url()).toMatch(/\/#?\/?$/);
  });

  test("preserves query params when navigating", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Query params should be preserved
    expect(page.url()).toContain("debug=1");
  });
});
