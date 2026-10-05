const path = require("node:path");
const root = path.resolve(__dirname, "..");

function resultsFile(suite) {
  if (process.env.WKLY_TEST_REPORT_DIR)
    return path.join(process.env.WKLY_TEST_REPORT_DIR, suite, "results.json");
  return path.join(
    root,
    ".test-build",
    suite === "picker" ? "domains/results.json" : `${suite}-results.json`,
  );
}

function reporters(suite) {
  const json = resultsFile(suite);
  return [
    ["list"],
    [
      "html",
      {
        outputFolder: path.join(
          root,
          suite === "picker"
            ? "playwright-report"
            : `playwright-report-${suite}`,
        ),
        open: "never",
      },
    ],
    ["json", { outputFile: json }],
    [
      "junit",
      {
        outputFile: json.replace(/\.json$/, ".xml"),
        includeProjectInTestName: true,
      },
    ],
    ...(process.env.GITHUB_ACTIONS === "true" ? [["github"]] : []),
  ];
}

module.exports = { reporters, resultsFile };
