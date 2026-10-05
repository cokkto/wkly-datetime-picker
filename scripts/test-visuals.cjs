const { spawnSync } = require("node:child_process");
const { majors } = require("./test-host-selection.cjs");
// Shared pixels need one writer per browser, not competing Angular projects.
const result = spawnSync(
  process.execPath,
  [
    "scripts/playwright.cjs",
    "test",
    "--config",
    "projects/wkly-datetime-picker.tests/playwright.config.ts",
    "--project",
    "*-layout",
    "--grep",
    "adjacent months",
    "--update-snapshots",
  ],
  {
    cwd: require("node:path").resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      WKLY_TEST_ANGULAR: majors.reduce((latest, major) =>
        Number(major) > Number(latest) ? major : latest,
      ),
      WKLY_TEST_PREBUILT: process.env.WKLY_TEST_PREBUILT || "0",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
