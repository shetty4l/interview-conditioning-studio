import { test, expect, type Page } from "playwright/test";

/**
 * Modal E2E Tests
 *
 * Tests for modal dialogs: resume banner, confirm modal, modal interactions.
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

  test("discard button shows confirmation modal", async ({ page }) => {
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

    // Click discard
    await page.click('[data-action="discard-session"]');

    // Should show confirmation modal
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator(".modal__title")).toContainText("Discard Session");
  });
});

test.describe("Confirm Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("confirm modal has confirm and cancel buttons", async ({ page }) => {
    // Create incomplete session to trigger discard modal
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Open confirm modal
    await page.click('[data-action="discard-session"]');

    // Verify buttons exist
    await expect(page.locator('[data-action="modal-confirm"]')).toBeVisible();
    await expect(page.locator('[data-action="modal-cancel"]')).toBeVisible();
  });

  test("cancel button closes modal without action", async ({ page }) => {
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

    // Open and cancel
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    await page.click('[data-action="modal-cancel"]');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Session should still exist
    const storedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(storedSession).not.toBeNull();

    // Resume banner should still be visible
    await expect(page.locator(".resume-banner")).toBeVisible();
  });

  test("confirm button executes action and closes modal", async ({ page }) => {
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

    // Open and confirm discard
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    await page.click('[data-action="modal-confirm"]');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

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
});

test.describe("Modal Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);
    await clearStorageAndVerify(page);
  });

  test("modal closes on backdrop click", async ({ page }) => {
    // Create incomplete session to get a modal
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    await waitForSessionPersisted(page, sessionId!);

    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Open modal
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    // Click backdrop (outside modal content)
    await page.click(".modal-backdrop", { position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("modal closes on close button click", async ({ page }) => {
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

    // Open modal
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    // Click close button
    await page.click(".modal__close");

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("modal closes on Escape key", async ({ page }) => {
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

    // Open modal
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("modal prevents body scroll when open", async ({ page }) => {
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

    // Check initial body overflow
    const initialOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(initialOverflow).toBe("");

    // Open modal
    await page.click('[data-action="discard-session"]');
    await expect(page.locator(".modal")).toBeVisible();

    // Body should have overflow hidden
    const modalOpenOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(modalOpenOverflow).toBe("hidden");

    // Close modal
    await page.click('[data-action="modal-cancel"]');
    await expect(page.locator(".modal")).not.toBeVisible();

    // Body overflow should be restored
    const afterCloseOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(afterCloseOverflow).toBe("");
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

    // Discard session
    await page.click('[data-action="discard-session"]');
    await page.click('[data-action="modal-confirm"]');

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
