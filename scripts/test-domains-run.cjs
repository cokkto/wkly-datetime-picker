const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { buildHosts } = require("./test-host-build.cjs");
const { majors } = require("./test-host-selection.cjs");
const { domains } = require("./test-domains.cjs");
const { browsers, supports } = require("./test-browsers.cjs");
const { resultsFile } = require("./test-reporters.cjs");
const root = path.resolve(__dirname, "..");
(async () => {
  // A failed run must not leave the previous successful summary in place.
  const summaryFile = path.join(
    path.dirname(resultsFile("picker")),
    "summary.json",
  );
  fs.rmSync(summaryFile, {
    force: true,
  });
  const build =
    process.env.WKLY_TEST_PREBUILT === "1"
      ? JSON.parse(
          fs.readFileSync(
            path.join(root, ".test-build/hosts/build.json"),
            "utf8",
          ),
        )
      : await buildHosts();
  const result = spawnSync(
    process.execPath,
    [
      "scripts/playwright.cjs",
      "test",
      "--config",
      "projects/wkly-datetime-picker.tests/playwright.config.ts",
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, WKLY_TEST_PREBUILT: "1" },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Test domain failed");
  // Filtered native Playwright runs do not claim a complete domain matrix audit.
  if (process.argv.length > 2) return;
  const report = JSON.parse(fs.readFileSync(resultsFile("picker"), "utf8"));
  if (
    !report.stats.expected ||
    report.stats.skipped ||
    report.stats.unexpected ||
    report.stats.flaky
  )
    throw new Error("Incomplete domain run");
  const metrics = [];
  function visit(suite) {
    for (const spec of suite.specs || [])
      for (const test of spec.tests)
        for (const result of test.results)
          for (const attachment of result.attachments || [])
            if (attachment.name === "domain-metrics")
              metrics.push(
                JSON.parse(
                  attachment.body
                    ? Buffer.from(attachment.body, "base64").toString()
                    : fs.readFileSync(attachment.path, "utf8"),
                ),
              );
    for (const child of suite.suites || []) visit(child);
  }
  visit(report);
  if (metrics.length !== report.stats.expected)
    throw new Error("Missing scenario metrics");
  for (const angular of majors)
    for (const browser of browsers)
      for (const domain of domains.filter((domain) =>
        supports(browser, domain),
      )) {
        const group = metrics.filter(
          (metric) =>
            metric.angular === angular &&
            metric.browser === browser &&
            metric.domain === domain.id,
        );
        if (
          !group.length ||
          new Set(group.map((metric) => metric.worker)).size !== 1
        )
          throw new Error(
            `Expected one context for Angular ${angular}/${browser}/${domain.id}`,
          );
        for (const suite of Object.keys(domain.suites)) {
          const page = group.filter((metric) => metric.suite === suite);
          if (
            !page.length ||
            new Set(page.map((metric) => metric.bootId)).size !== 1 ||
            page.some(
              (metric, index) =>
                metric.fixtureId !== index + 1 ||
                metric.mounts !== metric.destroys,
            )
          )
            throw new Error(
              `Page was not reused: Angular ${angular}/${browser}/${domain.id}/${suite}`,
            );
        }
      }
  const summary = {
    angular: majors,
    engines: browsers,
    domains: domains.map((domain) => domain.id),
    tests: report.stats.expected,
    browsers: new Set(metrics.map((metric) => metric.worker)).size,
    pages: new Set(metrics.map((metric) => metric.bootId)).size,
    browserMs: report.stats.duration,
    buildMs: build.totalMs,
  };
  if (
    summary.browsers !==
    majors.length *
      browsers.reduce(
        (count, browser) =>
          count + domains.filter((domain) => supports(browser, domain)).length,
        0,
      )
  )
    throw new Error("Unexpected browser count");
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
