import { test, expect, type Page } from "playwright/test";

/**
 * Confirm Actions E2E Tests
 *
 * Tests for two-click confirmation pattern: resume banner, confirm button, toasts.
 * Note: Modals were replaced with inline two-click confirmation buttons.
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

test.describe("Resume Banner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("shows resume banner when incomplete session exists", async ({ page }) => {
    // Create an incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Navigate to fresh home page (simulate new visit)
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should show resume banner
    await expect(page.locator(".resume-banner")).toBeVisible();
    await expect(page.locator(".resume-banner__title")).toContainText("Continue Previous Session");
  });

  test("does not show resume banner when no incomplete session", async ({ page }) => {
    // Just load home page with no sessions
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Should not show resume banner
    await expect(page.locator(".resume-banner")).not.toBeVisible();
  });

  test("resume button loads the incomplete session", async ({ page }) => {
    // Create an incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.updateInvariants("My test invariants");
      await window.IDS.startCoding();
      await window.IDS.updateCode("function test() { return 42; }");
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Navigate to fresh home page
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Click resume
    await page.click('[data-action="resume-session"]');

    // Should load the session and navigate to coding screen
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionId).toBe(sessionId);
    expect(state.sessionState?.phase).toBe("CODING");
    expect(state.sessionState?.code).toBe("function test() { return 42; }");
  });

  test("discard button uses two-click confirmation pattern", async ({ page }) => {
    // Create an incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    // Navigate to fresh home page
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // First click shows confirmation state
    const discardBtn = page.locator('[data-action="discard-session"]');
    await expect(discardBtn).toContainText("Discard");
    await discardBtn.click();

    // Button should now show confirmation text
    await expect(discardBtn).toContainText("Confirm");
  });
});

test.describe("Two-Click Confirmation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("confirm button changes text on first click", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // First click
    const discardBtn = page.locator('[data-action="discard-session"]');
    await discardBtn.click();

    // Button should show confirming state
    await expect(discardBtn).toHaveClass(/btn--confirming/);
    await expect(discardBtn).toContainText("Confirm");
  });

  test("button resets to original state on blur", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // First click
    const discardBtn = page.locator('[data-action="discard-session"]');
    await discardBtn.click();
    await expect(discardBtn).toContainText("Confirm");

    // Click elsewhere to blur
    await page.click("body", { position: { x: 10, y: 10 } });

    // Button should reset
    await expect(discardBtn).toContainText("Discard");
    await expect(discardBtn).not.toHaveClass(/btn--confirming/);

    // Session should still exist
    const storedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(storedSession).not.toBeNull();
  });

  test("second click executes the action", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Two clicks to confirm
    const discardBtn = page.locator('[data-action="discard-session"]');
    await discardBtn.click();
    await discardBtn.click();

    // Wait for deletion
    await page.waitForFunction(
      (id) => {
        return window.IDS.storage.getSession(id).then((s: unknown) => s === null);
      },
      sessionId!,
      { timeout: 5000 },
    );

    // Session should be deleted
    const storedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(storedSession).toBeNull();

    // Resume banner should be gone
    await expect(page.locator(".resume-banner")).not.toBeVisible();
  });

  test("button auto-resets after 3 seconds", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // First click
    const discardBtn = page.locator('[data-action="discard-session"]');
    await discardBtn.click();
    await expect(discardBtn).toContainText("Confirm");

    // Wait for auto-reset (3 seconds)
    await page.waitForTimeout(3500);

    // Button should reset
    await expect(discardBtn).toContainText("Discard");
    await expect(discardBtn).not.toHaveClass(/btn--confirming/);
  });
});

test.describe("Toast Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("shows toast on session resume", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Resume session
    await page.click('[data-action="resume-session"]');

    // Should show success toast
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("resumed");
  });

  test("shows toast on session discard", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Discard session (two clicks)
    const discardBtn = page.locator('[data-action="discard-session"]');
    await discardBtn.click();
    await discardBtn.click();

    // Should show info toast
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("discarded");
  });

  test("toast auto-dismisses after timeout", async ({ page }) => {
    // Create incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Resume session to trigger toast
    await page.click('[data-action="resume-session"]');

    // Toast should appear
    await expect(page.locator(".toast")).toBeVisible();

    // Wait for auto-dismiss (default is 3 seconds)
    await page.waitForTimeout(3500);

    // Toast should be gone
    await expect(page.locator(".toast")).not.toBeVisible();
  });
});
