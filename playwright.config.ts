import { defineConfig } from "@playwright/test";

const localNoProxy = "127.0.0.1,localhost";
process.env.NO_PROXY = process.env.NO_PROXY ? `${process.env.NO_PROXY},${localNoProxy}` : localNoProxy;
process.env.no_proxy = process.env.NO_PROXY;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5678",
    locale: "zh-CN",
    colorScheme: "light",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-360x640",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-390x844",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm exec rsbuild dev --host 127.0.0.1 --port 5678",
    url: "http://127.0.0.1:5678",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
