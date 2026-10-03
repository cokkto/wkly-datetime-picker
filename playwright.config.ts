const { defineConfig, devices } = require("./scripts/playwright-api.cjs");
const port = process.env.PORT || "4200";
const supported = require("./supported-angular.json");
const versions: string[] = process.env.WKLY_ANGULAR
  ? process.env.WKLY_ANGULAR.split(",")
  : Object.keys(supported);
for (const version of versions) {
  if (!supported[version]) throw new Error(`Unsupported Angular ${version}`);
}
const browsers = [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 1000 },
    },
  },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  {
    name: "chromium-hidpi",
    use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1.5 },
  },
  {
    name: "mobile",
    use: {
      ...devices["iPhone 13"],
      defaultBrowserType: "chromium",
      viewport: { width: 390, height: 844 },
    },
  },
];
export default defineConfig({
  testDir: "./projects/wkly-datetime-picker.tests/e2e",
  testMatch: [
    "testbeds.spec.ts",
    "**/interaction/*.spec.ts",
    "**/visual/*.spec.ts",
  ],
  fullyParallel: true,
  timeout: 30000,
  expect: { timeout: 7000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    timezoneId: "UTC",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: versions.flatMap((version) =>
    browsers.map((browser) => ({
      name: `angular-${version}-${browser.name}`,
      metadata: { angular: version, browser: browser.name },
      use: {
        ...browser.use,
        baseURL: `http://v${version}.wkly.localhost:${port}`,
      },
      // Component pixels are expected to match across Angular versions.
      snapshotPathTemplate: `{testDir}/baselines/${browser.name}/{arg}{ext}`,
    })),
  ),
  webServer: {
    command: process.env.CI
      ? "node scripts/serve.cjs --prebuilt"
      : "node scripts/serve.cjs",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.WKLY_E2E_REUSE_SERVER === "1",
    env: { WKLY_E2E: "1" },
    timeout: 180000,
  },
  snapshotPathTemplate: "{testDir}/baselines/{projectName}/{arg}{ext}",
});
