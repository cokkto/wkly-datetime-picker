// Fresh runs rebuild consumers; repeat runs revalidate their existing artifacts.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { majors } = require("./test-host-selection.cjs");
const { browsers } = require("./test-browsers.cjs");
const { resultsFile } = require("./test-reporters.cjs");
const supported = require("../supported-angular.json");
const { packageDirs, picker } = require("./public-packages.cjs");
const { verifyPackedConsumer } = require("./verify-packed-consumer.cjs");
const root = path.resolve(__dirname, "..");
const fixtures = path.join(
  root,
  "projects/wkly-datetime-picker.tests/packages/angular",
);
const fresh = process.argv.includes("--fresh");
const timings = require("./test-timings.cjs").createTimings(
  path.join(root, ".test-build/packed-timings.json"),
  { angular: majors, fresh },
);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const jobs = majors.map((major) => {
  const nodeMajor = supported[major].node.split(".")[0];
  const node =
    process.env[`WKLY_NODE_${nodeMajor}`] ||
    (process.versions.node.split(".")[0] === nodeMajor
      ? process.execPath
      : path.join(
          root,
          `.compat/node${nodeMajor}/node_modules/node/bin`,
          process.platform === "win32" ? "node.exe" : "node",
        ));
  const consumer = path.join(root, `.compat/consumer-${major}`);
  if (
    !fs.existsSync(node) ||
    (!fresh &&
      !fs.existsSync(
        path.join(consumer, "node_modules/@angular/cli/package.json"),
      ))
  )
    throw new Error(
      `Prepare/install Angular ${major}'s consumer and provide Node ${nodeMajor} with WKLY_NODE_${nodeMajor}`,
    );
  if (
    execFileSync(node, ["-p", "process.versions.node.split('.')[0]"], {
      encoding: "utf8",
    }).trim() !== nodeMajor
  )
    throw new Error(`Wrong Node executable for Angular ${major}`);
  return { major, node, consumer };
});
for (const { major, node, consumer } of jobs) {
  const info = supported[major];
  console.log(`Packed Angular ${major}: integrity, AOT and SSR`);
  if (fresh) {
    timings.measure(`Angular ${major}: prepare`, () =>
      execFileSync(
        process.execPath,
        ["scripts/compatibility.cjs", "prepare", major],
        { cwd: root, stdio: "inherit" },
      ),
    );
    const env = {
      ...process.env,
      PATH: path.dirname(node) + path.delimiter + process.env.PATH,
    };
    timings.measure(`Angular ${major}: fresh compatibility`, () =>
      execFileSync(node, ["scripts/compatibility.cjs", "test", major], {
        cwd: root,
        stdio: "inherit",
        env,
      }),
    );
    continue;
  }
  timings.measure(`Angular ${major}: integrity`, () =>
    verifyPackedConsumer({
      consumer,
      dist: path.join(root, `.compat/${major}/dist`),
      names: Object.keys(packageDirs(major)),
      packageDirs: packageDirs(major),
      dependencies: read(path.join(consumer, "package.json")).dependencies,
      cdkVersion: info.dependencies["@angular/cdk"],
    }),
  );
  const source = fs
    .readFileSync(path.join(fixtures, "main.ts"), "utf8")
    .replaceAll("__PACKAGE__", picker)
    .replace(
      "/* COMPONENT_OPTIONS */",
      Number(major) >= 14 ? "standalone: false," : "",
    )
    .replace(
      "/* OVERLAY_IMPORT */",
      `import { WklyDateTimePickerOverlayModule } from "${picker}/cdk-overlay";`,
    )
    .replace("/* OVERLAY_MODULE */", ", WklyDateTimePickerOverlayModule")
    .replace(
      "<!-- OVERLAY_TRIGGER -->",
      '<input id="overlay" aria-label="Open overlay" wklyDateTimePickerOverlay mode="date">',
    );
  fs.writeFileSync(path.join(consumer, "main.ts"), source);
  const cli = path.join(consumer, "node_modules/@angular/cli");
  const env = { ...process.env, NG_CLI_ANALYTICS: "false" };
  timings.measure(`Angular ${major}: AOT`, () =>
    execFileSync(
      node,
      [
        path.join(cli, read(path.join(cli, "package.json")).bin.ng),
        "build",
        "consumer",
      ],
      { cwd: consumer, stdio: "inherit", env },
    ),
  );
  fs.copyFileSync(
    path.join(fixtures, "ssr.cjs"),
    path.join(consumer, "ssr.cjs"),
  );
  timings.measure(`Angular ${major}: SSR`, () =>
    execFileSync(node, ["ssr.cjs", picker], {
      cwd: consumer,
      stdio: "inherit",
      env,
    }),
  );
}
timings.measure("Packed browsers", () =>
  execFileSync(
    process.execPath,
    [
      "scripts/playwright.cjs",
      "test",
      "--config",
      "projects/wkly-datetime-picker.tests/packages/angular/playwright.config.cjs",
    ],
    { cwd: root, stdio: "inherit" },
  ),
);
const report = read(resultsFile("packed"));
if (
  report.stats.expected !== majors.length * browsers.length ||
  report.stats.skipped ||
  report.stats.unexpected ||
  report.stats.flaky
)
  throw new Error("Incomplete packed startup matrix");
console.log(
  `PASS ${majors.length} packed consumers: integrity, fresh AOT, SSR and browser startup`,
);
timings.complete();
