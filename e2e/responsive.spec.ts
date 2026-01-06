import { test, expect } from "playwright/test";
import { goToNewSession, startSession, goToCoding } from "./_helpers";

/**
 * Responsive CSS E2E Tests
 *
 * Tests that the UI renders correctly at different viewport sizes.
 * These tests focus on layout and visibility, not full user flows.
 */

test.describe("Mobile Viewport (360px)", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
    await goToNewSession(page);
  });

  test("home screen renders without horizontal overflow", async ({ page }) => {
    // Title should be visible
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Preset cards should be visible
    await expect(page.getByRole("button", { name: /Standard/ })).toBeVisible();

    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("phase header displays correctly on mobile", async ({ page }) => {
    // Start a session to get to coding phase
    await startSession(page);
    await goToCoding(page);

    // Phase header should be visible
    const phaseHeader = page.locator(".phase-header");
    await expect(phaseHeader).toBeVisible();

    // Phase badge should be visible
    await expect(page.getByText("CODING")).toBeVisible();

    // Timer should be visible
    const timer = page.locator(".timer");
    await expect(timer).toBeVisible();
  });

  test("code editor is usable on mobile", async ({ page }) => {
    await startSession(page);
    await goToCoding(page);

    // Wait for coding screen to render
    await expect(page.getByText("CODING")).toBeVisible();

    const codeInput = page.getByRole("textbox");
    await expect(codeInput).toBeVisible();

    // Should be able to type
    await codeInput.fill("function test() {}");
    await expect(codeInput).toHaveValue("function test() {}");
  });

  test("toast container is positioned within viewport", async ({ page }) => {
    // Toast container should exist and be positioned correctly
    const toastContainer = page.locator("#toast-container");
    await expect(toastContainer).toBeAttached();

    const box = await toastContainer.boundingBox();
    if (box) {
      // Should be within viewport horizontally
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
  });
});

test.describe("Tablet Viewport (768px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
    await goToNewSession(page);
  });

  test("home screen layout is correct", async ({ page }) => {
    const app = page.locator("#app");
    await expect(app).toBeVisible();

    // Preset cards should be visible
    await expect(page.getByRole("button", { name: /Standard/ })).toBeVisible();

    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("prep screen renders correctly", async ({ page }) => {
    await startSession(page);

    // Wait for prep screen to render (PREP badge in header)
    await expect(page.getByText("PREP", { exact: true })).toBeVisible();

    // Problem title should be visible (in collapsible section)
    const problemTitle = page.locator(".collapsible__title").filter({ hasText: "Problem:" });
    await expect(problemTitle).toBeVisible();

    // Invariants input should be visible
    const invariantsInput = page.getByRole("textbox");
    await expect(invariantsInput).toBeVisible();
  });
});

test.describe("Desktop Viewport (1200px)", () => {
  test.use({ viewport: { width: 1200, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
    await goToNewSession(page);
  });

  test("app container is centered with max-width", async ({ page }) => {
    const app = page.locator("#app");
    const box = await app.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      // App should be centered (not starting at 0)
      expect(box.x).toBeGreaterThan(0);
      // App should have max-width applied (1100px)
      expect(box.width).toBeLessThanOrEqual(1100);
    }
  });

  test("phase header elements align horizontally", async ({ page }) => {
    await startSession(page);
    await goToCoding(page);

    // Wait for coding screen elements - use correct class name
    const phaseBadge = page.locator(".phase-header__badge");
    await expect(phaseBadge).toBeVisible({ timeout: 10000 });

    const timer = page.locator(".timer");
    await expect(timer).toBeVisible();

    const badgeBox = await phaseBadge.boundingBox();
    const timerBox = await timer.boundingBox();

    // Badge and timer should be on the same row (similar Y)
    if (badgeBox && timerBox) {
      expect(Math.abs(badgeBox.y - timerBox.y)).toBeLessThan(30);
    }
  });

  test("code editor has full height on desktop", async ({ page }) => {
    await startSession(page);
    await goToCoding(page);

    // Wait for coding screen
    await expect(page.getByText("CODING")).toBeVisible();

    const codeInput = page.getByRole("textbox");
    const box = await codeInput.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      // Code input should have substantial height on desktop
      expect(box.height).toBeGreaterThanOrEqual(350);
    }
  });
});

test.describe("Touch Target Size", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.IDS?.storage?.clearAll);
    await page.evaluate(() => window.IDS.storage.clearAll());
    await page.waitForTimeout(100);
    await goToNewSession(page);
  });

  test("buttons meet minimum touch target size (44px)", async ({ page }) => {
    // Select a preset to enable the start button
    await page.getByRole("button", { name: /Standard/ }).click();

    const startButton = page.getByRole("button", { name: "Start Session" });
    const box = await startButton.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      // Minimum touch target is 44px
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("preset cards have adequate tap area", async ({ page }) => {
    const presetCard = page.getByRole("button", { name: /Standard/ });
    const box = await presetCard.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      // Should have substantial tap area
      expect(box.height).toBeGreaterThanOrEqual(60);
    }
  });
});
