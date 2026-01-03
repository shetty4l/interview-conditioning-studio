import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
