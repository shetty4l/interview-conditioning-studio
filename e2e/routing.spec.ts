import { test, expect } from "playwright/test";

/**
 * Routing E2E Tests
 *
 * Tests for hash-based routing with session ID support.
 * Routing model:
 * - #/ → Dashboard
 * - #/new → New session screen
 * - #/:id → Session (phase determined by state.screen, not URL)
 * - #/:id/view → Read-only session view (future)
 */

test.describe("Hash Routing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
  });

  test("parses dashboard route from empty hash", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    const path = await page.evaluate(() => window.IDS.router.getPath());
    expect(path).toBe("/");
  });

  test("parses dashboard route from #/", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    const path = await page.evaluate(() => window.IDS.router.getPath());
    expect(path).toBe("/");
  });

  test("parses new session route from #/new", async ({ page }) => {
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    const path = await page.evaluate(() => window.IDS.router.getPath());
    expect(path).toBe("/new");
  });

  test("parses session route from hash", async ({ page }) => {
    // First create a session by clicking Start Session
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Click Start Session button
    await page.click('button:has-text("Start Session")');
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for navigation to session URL
    await page.waitForFunction((id) => window.location.hash.includes(id!), sessionId, {
      timeout: 5000,
    });

    const path = await page.evaluate(() => window.IDS.router.getPath());
    expect(path).toBe(`/${sessionId}`);
  });

  test("session URL stays constant during phase transitions", async ({ page }) => {
    // Create session
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    await page.click('button:has-text("Start Session")');
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for navigation to session URL
    await page.waitForFunction((id) => window.location.hash.includes(id!), sessionId, {
      timeout: 5000,
    });

    // URL should be #/:id (no phase in URL)
    expect(page.url()).toContain(`#/${sessionId}`);
    expect(page.url()).not.toContain("/prep");

    // State should show prep
    let state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("prep");

    // Transition to coding
    await page.click('button:has-text("Start Coding")');
    await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");

    // URL should still be same (no /coding suffix)
    expect(page.url()).toContain(`#/${sessionId}`);
    expect(page.url()).not.toContain("/coding");

    // State should show coding
    state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.screen).toBe("coding");
  });

  test("redirects to dashboard when session not found", async ({ page }) => {
    await page.goto("/#/nonexistent123");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to dashboard
    await page.waitForFunction(() => {
      const hash = window.location.hash;
      return hash === "" || hash === "#" || hash === "#/";
    });
    expect(page.url()).toMatch(/\/#?\/?$/);
  });

  test("navigates to session when clicking Resume on dashboard", async ({ page }) => {
    // First create a session
    await page.goto("/#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    await page.click('button:has-text("Start Session")');
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for session to be saved to storage
    await page.waitForFunction(
      (id) => window.IDS.storage.getSession(id!).then((s: unknown) => s !== null),
      sessionId,
      { timeout: 5000 },
    );

    // Go to dashboard
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for dashboard to load sessions (session list or session card appears)
    await page.waitForSelector(".session-card, .dashboard__list", { timeout: 10000 });

    // Click Resume on the session
    await page.click('button:has-text("Resume")');
    await page.waitForFunction((id) => window.location.hash.includes(id!), sessionId, {
      timeout: 5000,
    });

    // Should be at session URL
    expect(page.url()).toContain(`#/${sessionId}`);
  });

  test("router.navigate() changes URL", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Navigate to new session screen via API
    await page.evaluate(() => window.IDS.router.navigate("/new"));
    await page.waitForFunction(() => window.location.hash === "#/new");

    expect(page.url()).toContain("#/new");

    // Navigate back to dashboard
    await page.evaluate(() => window.IDS.router.navigate("/"));
    await page.waitForFunction(() => window.location.hash === "#/");

    expect(page.url()).toMatch(/\/#?\/?$/);
  });

  test("preserves query params when navigating", async ({ page }) => {
    await page.goto("/?debug=1#/new");
    await page.waitForFunction(() => window.IDS?.getAppState);

    await page.click('button:has-text("Start Session")');
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Query params should be preserved
    expect(page.url()).toContain("debug=1");
  });

  test("handles #/:id/view route", async ({ page }) => {
    // View route is not fully implemented yet - it redirects to dashboard
    await page.goto("/#/abc123/view");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Wait for redirect to dashboard (ViewScreen redirects to "/" on mount)
    await page.waitForFunction(
      () => {
        const hash = window.location.hash;
        return hash === "" || hash === "#" || hash === "#/";
      },
      undefined,
      { timeout: 5000 },
    );

    // Path should now be dashboard (after redirect)
    const path = await page.evaluate(() => window.IDS.router.getPath());
    expect(path).toBe("/");

    // Toast should have been shown
    await expect(page.locator(".toast")).toBeVisible();
  });
});
