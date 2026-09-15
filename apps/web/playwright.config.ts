import { defineConfig, devices } from "@playwright/test";

const config = {
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 30_000,
  reporter: "list" as const,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure" as const,
    screenshot: "only-on-failure" as const,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
};

export default defineConfig(
  process.env.PLAYWRIGHT_BASE_URL
    ? config
    : { ...config, webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 } }
);
