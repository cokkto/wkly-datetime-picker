const path = require("node:path");
const { defineConfig } = require("@playwright/test");
const { majors } = require("../../../scripts/test-host-selection.cjs");
const { browsers } = require("../../../scripts/test-browsers.cjs");
const root = path.resolve(__dirname, "../../..");
const port = process.env.WKLY_SHOWCASE_PORT || "4330";
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "*.spec.cjs",
  workers: 2,
  retries: 0,
  timeout: 60000,
  outputDir: path.join(root, "test-results/showcase"),
  reporter: require("../../../scripts/test-reporters.cjs").reporters(
    "showcase",
  ),
  projects: browsers.flatMap((browser) => [
    ...majors.map((major) => ({
      name: `angular-${major}-${browser}-showcase`,
      testMatch: "testbeds.spec.cjs",
      metadata: { angular: major },
      use: {
        browserName: browser,
        baseURL: `http://v${major}.wkly.localhost:${port}`,
        viewport: { width: 1280, height: 900 },
      },
    })),
    {
      name: `${browser}-catalogue`,
      testMatch: "catalogue.spec.cjs",
      use: {
        browserName: browser,
        baseURL: `http://wkly.localhost:${port}`,
        viewport: { width: 1280, height: 900 },
      },
    },
  ]),
  webServer: {
    command: "node scripts/serve.cjs --prebuilt",
    cwd: path.resolve(__dirname, "../../.."),
    url: `http://127.0.0.1:${port}`,
    env: { PORT: port },
    reuseExistingServer: false,
    timeout: 180000,
  },
});
