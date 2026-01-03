import { test, expect } from "playwright/test";

test.describe("App loads", () => {
  test("should display the app title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Interview Conditioning Studio");
  });

  test("should show the main heading", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Interview Conditioning Studio" }),
    ).toBeVisible();
  });
});
