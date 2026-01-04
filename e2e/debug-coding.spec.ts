import { test, expect } from "playwright/test";
import { clearStorage, goToNewSession, startSession, goToCoding } from "./_helpers";

test("debug coding screen buttons", async ({ page }) => {
  await goToNewSession(page);

  // Clear storage
  await clearStorage(page);

  // Start session
  await startSession(page);
  console.log("In prep screen");

  // Click start coding
  await goToCoding(page);
  console.log("In coding screen");

  // Wait a moment for DOM to update
  await page.waitForTimeout(500);

  // Debug: what buttons exist?
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    return Array.from(btns).map((b) => ({
      class: b.className,
      text: b.textContent,
      dataAction: b.getAttribute("data-action"),
    }));
  });
  console.log("Buttons found:", JSON.stringify(buttons, null, 2));

  // Check if Submit Solution button exists
  const hasSubmit = await page.locator('button:has-text("Submit Solution")').count();
  console.log("Submit Solution button count:", hasSubmit);

  expect(hasSubmit).toBeGreaterThan(0);
});
