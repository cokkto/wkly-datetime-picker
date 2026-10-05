const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const supported = require("../supported-angular.json");
const root = path.resolve(__dirname, "..");
const available = Object.keys(supported).sort((a, b) => Number(a) - Number(b));

function createCheckPlan(profile, callerEnv = process.env, flags = []) {
  if (!["dev", "push", "pr", "release"].includes(profile))
    throw new Error(
      "Usage: test-check.cjs dev | push | pr | release [--reuse-packed] [--update-snapshots]",
    );
  if (
    flags.some(
      (flag) => !["--reuse-packed", "--update-snapshots"].includes(flag),
    ) ||
    (flags.length && profile !== "release")
  )
    throw new Error(
      "Only release supports --reuse-packed and --update-snapshots",
    );
  const angular =
    profile === "dev"
      ? callerEnv.WKLY_TEST_ANGULAR || available.at(-1)
      : profile === "push"
        ? [...new Set([available[0], available.at(-1)])].join(",")
        : available.join(",");
  const browsers =
    profile === "dev"
      ? callerEnv.WKLY_TEST_BROWSERS || "chromium"
      : profile === "push"
        ? "chromium"
        : "chromium,firefox,webkit";
  for (const [name, value, allowed] of [
    ["WKLY_TEST_ANGULAR", angular, available],
    ["WKLY_TEST_BROWSERS", browsers, ["chromium", "firefox", "webkit"]],
  ]) {
    const selected = value.split(",");
    if (
      new Set(selected).size !== selected.length ||
      selected.some((item) => !allowed.includes(item))
    )
      throw new Error(`${name} must contain distinct supported values`);
  }
  const env = {
    ...callerEnv,
    WKLY_TEST_ANGULAR: angular,
    WKLY_TEST_BROWSERS: browsers,
    WKLY_TEST_PREBUILT: "1",
    WKLY_TEST_REPORT_DIR: path.join(root, ".test-build/checks", profile),
  };
  const stages = [];
  const add = (name, args, report) => stages.push({ name, args, report });
  if (profile !== "dev") {
    add("Tooling contracts", [
      "--test",
      "scripts/compatibility.test.cjs",
      "scripts/lint.test.cjs",
      "scripts/showcase-server.test.cjs",
      "scripts/test-check.test.cjs",
      "scripts/test-host-server.test.cjs",
    ]);
    add("Lint", ["scripts/lint.cjs"]);
    add("Typecheck", [
      "projects/wkly-datetime-picker.runtime.18/node_modules/typescript/bin/tsc",
      "--project",
      "projects/wkly-datetime-picker.tests/tsconfig.json",
    ]);
  }
  add("Source contracts", ["scripts/test.cjs"]);
  if (["pr", "release"].includes(profile))
    add("Shared package contracts", ["scripts/test-installed.cjs"]);
  add("Picker host builds", ["scripts/test-host-build.cjs"]);
  if (flags.includes("--update-snapshots"))
    add("Update visual baselines", ["scripts/test-visuals.cjs"]);
  add("Picker domains", ["scripts/test-domains-run.cjs"]);
  if (profile === "release")
    add("Angular package qualification", [
      "scripts/test-packed.cjs",
      ...(flags.includes("--reuse-packed") ? [] : ["--fresh"]),
    ]);
  if (["pr", "release"].includes(profile)) {
    add("Showcase build", ["scripts/showcase-build.cjs"]);
    add(
      "Showcase browsers",
      [
        "scripts/playwright.cjs",
        "test",
        "--config",
        "projects/wkly-datetime-picker.tests/showcase/playwright.config.cjs",
      ],
      "showcase",
    );
  }
  return {
    profile,
    env,
    stages,
    packedArtifacts:
      profile === "release"
        ? flags.includes("--reuse-packed")
          ? "existing artifacts; not fresh release qualification"
          : "fresh"
        : "not included",
  };
}

function runCheck(plan) {
  const start = Date.now();
  const file = path.join(plan.env.WKLY_TEST_REPORT_DIR, "summary.json");
  const summary = {
    profile: plan.profile,
    angular: plan.env.WKLY_TEST_ANGULAR.split(","),
    browsers: plan.env.WKLY_TEST_BROWSERS.split(","),
    packedArtifacts: plan.packedArtifacts,
    stages: [],
    totalMs: 0,
    passed: false,
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const save = () => {
    summary.totalMs = Date.now() - start;
    fs.writeFileSync(file, JSON.stringify(summary, null, 2));
  };
  console.log(
    `${plan.profile}: Angular ${summary.angular.join(", ")}; ${summary.browsers.join(", ")}; packages: ${summary.packedArtifacts}`,
  );
  // Write a failing summary immediately so an interrupted run cannot appear successful.
  save();
  try {
    for (const stage of plan.stages) {
      console.log(`\n=== ${stage.name} ===`);
      const started = Date.now();
      const result = spawnSync(process.execPath, stage.args, {
        cwd: root,
        stdio: "inherit",
        env: plan.env,
      });
      let passed = !result.error && result.status === 0;
      if (passed && stage.report) {
        const report = JSON.parse(
          fs.readFileSync(
            path.join(
              plan.env.WKLY_TEST_REPORT_DIR,
              stage.report,
              "results.json",
            ),
            "utf8",
          ),
        );
        passed =
          report.stats.expected ===
            summary.angular.length * summary.browsers.length +
              summary.browsers.length &&
          !report.stats.unexpected &&
          !report.stats.skipped &&
          !report.stats.flaky;
      }
      summary.stages.push({
        name: stage.name,
        durationMs: Date.now() - started,
        passed,
        exitCode: result.status,
        error: result.error?.message,
      });
      save();
      if (!passed)
        throw new Error(`${stage.name} failed; see stage output and ${file}`);
    }
    summary.passed = true;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    save();
    console.table(
      summary.stages.map(({ name, durationMs, passed }) => ({
        stage: name,
        seconds: (durationMs / 1000).toFixed(1),
        passed,
      })),
    );
    console.log(
      `Total: ${(summary.totalMs / 60000).toFixed(2)} minutes; ${summary.passed ? "PASS" : "FAIL"}; summary: ${file}`,
    );
  }
}

module.exports = { createCheckPlan, runCheck };
if (require.main === module)
  runCheck(
    createCheckPlan(process.argv[2], process.env, process.argv.slice(3)),
  );
