import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Each test gets its own browser context with isolated IndexedDB
  fullyParallel: true,
  workers: process.env.CI ? "100%" : "50%",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
  },

  webServer: {
    command: "bun run serve",
    url: "http://localhost:8000",
    reuseExistingServer: !process.env.CI,
    timeout: 10 * 1000,
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
