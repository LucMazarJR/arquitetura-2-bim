import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:8080",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
