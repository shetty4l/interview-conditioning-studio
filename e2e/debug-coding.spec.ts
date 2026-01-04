import { test, expect } from "playwright/test";

test("debug coding screen buttons", async ({ page }) => {
  await page.goto("/#/new");
  await page.waitForFunction(() => window.IDS?.getAppState);
  
  // Clear storage
  await page.evaluate(() => window.IDS.storage.clearAll());
  
  // Start session
  await page.click(".start-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "prep");
  console.log("In prep screen");
  
  // Click start coding
  await page.click(".start-coding-button");
  await page.waitForFunction(() => window.IDS.getAppState().screen === "coding");
  console.log("In coding screen");
  
  // Wait a moment for DOM to update
  await page.waitForTimeout(500);
  
  // Debug: what buttons exist?
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    return Array.from(btns).map(b => ({
      class: b.className,
      text: b.textContent,
      dataAction: b.getAttribute('data-action')
    }));
  });
  console.log('Buttons found:', JSON.stringify(buttons, null, 2));
  
  // Check if submit-solution exists
  const hasSubmit = await page.locator('[data-action="submit-solution"]').count();
  console.log('submit-solution count:', hasSubmit);
  
  expect(hasSubmit).toBeGreaterThan(0);
});
