import { test, expect, type Page } from "playwright/test";

/**
 * Persistence E2E Tests
 *
 * Tests for IndexedDB session persistence and recovery.
 * Run serially because they share IndexedDB state.
 */

// Helper to wait for storage to have expected session count
async function waitForSessionCount(page: Page, count: number, timeout = 5000) {
  await page.waitForFunction(
    (expectedCount) => {
      return window.IDS.storage
        .getStats()
        .then((stats: { sessionCount: number }) => stats.sessionCount === expectedCount);
    },
    count,
    { timeout },
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

// Helper to clear storage and verify it's empty
async function clearStorageAndVerify(page: Page) {
  await page.waitForFunction(() => window.IDS?.storage?.clearAll);
  await page.evaluate(() => window.IDS.storage.clearAll());

  // Wait for storage to be empty
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

test.describe.serial("Session Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and clear storage before each test
    await page.goto("/?debug=1");
    await clearStorageAndVerify(page);
  });

  test("saves session to IndexedDB on state changes", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Start session
    await page.evaluate(() => window.IDS.startSession());

    // Wait for session ID to be set
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Get session ID
    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for session to be persisted
    await waitForSessionPersisted(page, sessionId!);

    // Check storage
    const stats = await page.evaluate(() => window.IDS.storage.getStats());
    expect(stats.sessionCount).toBe(1);

    // Verify session exists in storage
    const storedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(storedSession).not.toBeNull();
    expect(storedSession?.id).toBe(sessionId);
  });

  test("restores session on page reload", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Start session and make some changes
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.updateInvariants("Test invariants");
      await window.IDS.startCoding();
      await window.IDS.updateCode("function test() {}");
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, sessionId!);

    // Reload the page with the session URL
    await page.goto(`/?debug=1#/${sessionId}/coding`);
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Verify state was restored
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionId).toBe(sessionId);
    expect(state.sessionState?.phase).toBe("CODING");
    expect(state.sessionState?.invariants).toBe("Test invariants");
    expect(state.sessionState?.code).toBe("function test() {}");
  });

  test("restores correct phase from stored session", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create session and advance to summary
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.startCoding();
      await window.IDS.submitSolution();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, sessionId!);

    // Reload page
    await page.goto(`/?debug=1#/${sessionId}/summary`);
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    // Verify phase
    const state = await page.evaluate(() => window.IDS.getAppState());
    expect(state.sessionState?.phase).toBe("SUMMARY");
  });

  test("persists events across sessions", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create session with multiple events
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    await page.evaluate(async () => {
      await window.IDS.updateInvariants("Some notes");
      await window.IDS.startCoding();
      await window.IDS.requestNudge();
    });

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);
    const eventCount = await page.evaluate(
      () => window.IDS.getAppState().session?.getEvents().length,
    );
    expect(eventCount).toBe(4); // started, invariants, coding, nudge

    // Wait for persist
    await waitForSessionPersisted(page, sessionId!);

    // Reload and verify events
    await page.goto(`/?debug=1#/${sessionId}/coding`);
    await page.waitForFunction(() => window.IDS?.getAppState);
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const restoredEventCount = await page.evaluate(
      () => window.IDS.getAppState().session?.getEvents().length,
    );
    expect(restoredEventCount).toBe(4);
  });

  test("detects incomplete session on home page load", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create an incomplete session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, sessionId!);

    // Verify session is in storage
    await waitForSessionCount(page, 1);

    // Go to home (simulating new tab/window) - clear the current session state first
    await page.evaluate(() => {
      // Reset local state but keep storage
      window.IDS.resetApp();
    });

    // Wait for reset to complete
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    // Now navigate to home
    await page.goto("/?debug=1#/");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Check that incomplete session was detected
    // (In future phases, this would show a resume modal)
    const incomplete = await page.evaluate(() => window.IDS.storage.getIncompleteSession());
    expect(incomplete).not.toBeNull();
    expect(incomplete?.id).toBe(sessionId);
  });

  test("clears session from storage on abandon", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const sessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, sessionId!);
    await waitForSessionCount(page, 1);

    // Abandon session
    await page.evaluate(() => window.IDS.abandonSession());

    // Wait for session to be deleted
    await waitForSessionCount(page, 0);

    // Verify it was deleted
    const deletedSession = await page.evaluate(
      (id) => window.IDS.storage.getSession(id),
      sessionId!,
    );
    expect(deletedSession).toBeNull();
  });

  test("handles multiple sessions in storage", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create first session
    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const firstSessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, firstSessionId!);

    // Complete first session
    await page.evaluate(async () => {
      await window.IDS.startCoding();
      await window.IDS.submitSolution();
      await window.IDS.continuePastSummary();
      await window.IDS.submitReflection({
        clearApproach: "yes",
        prolongedStall: "no",
        recoveredFromStall: "n/a",
        timePressure: "comfortable",
        wouldChangeApproach: "no",
      });
    });

    // Wait for first session to be saved
    await waitForSessionCount(page, 1);

    // Reset and create second session
    await page.evaluate(() => window.IDS.resetApp());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);

    await page.evaluate(() => window.IDS.startSession());
    await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

    const secondSessionId = await page.evaluate(() => window.IDS.getAppState().sessionId);

    // Wait for persist
    await waitForSessionPersisted(page, secondSessionId!);
    await waitForSessionCount(page, 2);

    // Both sessions should exist
    const stats = await page.evaluate(() => window.IDS.storage.getStats());
    expect(stats.sessionCount).toBe(2);

    // Verify both can be retrieved
    const first = await page.evaluate((id) => window.IDS.storage.getSession(id), firstSessionId!);
    const second = await page.evaluate((id) => window.IDS.storage.getSession(id), secondSessionId!);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });

  test("getAllSessions returns sessions sorted by updatedAt", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.waitForFunction(() => window.IDS?.getAppState);

    // Create multiple sessions
    const sessionIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.IDS.startSession());
      await page.waitForFunction(() => window.IDS.getAppState().sessionId !== null);

      const id = await page.evaluate(() => window.IDS.getAppState().sessionId);
      sessionIds.push(id!);

      // Wait for persist
      await waitForSessionPersisted(page, id!);

      // Complete the session to allow creating another
      await page.evaluate(async () => {
        await window.IDS.startCoding();
        await window.IDS.submitSolution();
        await window.IDS.continuePastSummary();
        await window.IDS.submitReflection({
          clearApproach: "yes",
          prolongedStall: "no",
          recoveredFromStall: "n/a",
          timePressure: "comfortable",
          wouldChangeApproach: "no",
        });
      });

      await page.evaluate(() => window.IDS.resetApp());
      await page.waitForFunction(() => window.IDS.getAppState().sessionId === null);
    }

    // Wait for all sessions to be saved
    await waitForSessionCount(page, 3);

    // Get all sessions
    const allSessions = await page.evaluate(() => window.IDS.storage.getAllSessions());
    expect(allSessions.length).toBe(3);

    // Should be sorted by updatedAt descending (most recent first)
    // The last session created should be first
    expect(allSessions[0].id).toBe(sessionIds[2]);
  });
});
