import { test, expect } from "playwright/test";

test.describe("App loads", () => {
  test("should display the app title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Interview Conditioning Studio");
  });

  test("should show the dashboard heading", async ({ page }) => {
    await page.goto("/");

    // Dashboard is now the landing page, so we expect "Dashboard" heading
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });
});
