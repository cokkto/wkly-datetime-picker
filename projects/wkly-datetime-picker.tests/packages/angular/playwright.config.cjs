const path = require("node:path");
const { defineConfig } = require("@playwright/test");
const { majors } = require("../../../../scripts/test-host-selection.cjs");
const { browsers } = require("../../../../scripts/test-browsers.cjs");
const root = path.resolve(__dirname, "../../../..");
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "startup.spec.cjs",
  workers: 2,
  retries: 0,
  timeout: 30000,
  outputDir: path.join(root, "test-results/packed"),
  reporter: require("../../../../scripts/test-reporters.cjs").reporters(
    "packed",
  ),
  projects: majors.flatMap((major) =>
    browsers.map((browser) => ({
      name: `angular-${major}-${browser}-packed`,
      metadata: { angular: major },
      use: {
        browserName: browser,
        timezoneId: "UTC",
        baseURL: `http://127.0.0.1:${process.env.WKLY_PACKED_PORT || "4321"}/${major}/`,
      },
    })),
  ),
  webServer: {
    command:
      "node projects/wkly-datetime-picker.tests/packages/angular/server.cjs",
    cwd: root,
    url: `http://127.0.0.1:${process.env.WKLY_PACKED_PORT || "4321"}/health`,
    reuseExistingServer: false,
  },
});
