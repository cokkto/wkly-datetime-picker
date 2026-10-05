import { defineConfig } from "@playwright/test";
import path from "node:path";
const {
  majors,
}: { majors: string[] } = require("../../scripts/test-host-selection.cjs");
const {
  domains,
}: {
  domains: {
    id: string;
    timezoneId: string;
    device?: {
      hasTouch: boolean;
      isMobile: boolean;
      deviceScaleFactor: number;
    };
    suites: Record<string, { width: number; height: number; zoom?: number }>;
  }[];
} = require("../../scripts/test-domains.cjs");
const {
  browsers,
  supports,
}: {
  browsers: ("chromium" | "firefox" | "webkit")[];
  supports: (browser: string, domain: { id: string }) => boolean;
} = require("../../scripts/test-browsers.cjs");
const root = path.resolve(__dirname, "../..");
const {
  testHostURL,
}: {
  testHostURL: (major: string) => string;
} = require("../../scripts/test-host-address.cjs");
export default defineConfig({
  testDir: path.join(__dirname, "e2e/domains"),
  globalSetup: require.resolve("../../scripts/test-host-setup.cjs"),
  fullyParallel: false,
  workers: 6,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 5000 },
  // Component appearance is shared across Angular versions, so the same
  // platform baseline checks every version instead of storing duplicate images.
  snapshotPathTemplate: "{testDir}/../../baselines/{platform}/{arg}{ext}",
  outputDir: path.join(root, "test-results/domains"),
  reporter: require("../../scripts/test-reporters.cjs").reporters("picker"),
  projects: majors.flatMap((major) =>
    browsers.flatMap((browser) =>
      domains
        .filter((domain) => supports(browser, domain))
        .map((domain) => ({
          name: `angular-${major}-${browser}-${domain.id}`,
          snapshotPathTemplate: `{testDir}/../../baselines/{platform}/${browser}/{arg}{ext}`,
          workers: 1,
          testMatch: `${domain.id}.spec.ts`,
          metadata: {
            angular: major,
            browser,
            domain: domain.id,
            suites: domain.suites,
          },
          use: {
            baseURL: testHostURL(major),
            browserName: browser,
            timezoneId: domain.timezoneId,
            ...domain.device,
          },
        })),
    ),
  ),
  webServer: {
    command: "node scripts/test-host-server.cjs",
    cwd: root,
    url: `http://127.0.0.1:${process.env.WKLY_TEST_PORT || "4318"}/health`,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
