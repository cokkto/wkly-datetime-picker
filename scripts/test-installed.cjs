// Resolve contracts from freshly packed shared packages in an isolated consumer.
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const esbuild = require("esbuild");
const { verifyPackedConsumer } = require("./verify-packed-consumer.cjs");
const root = path.resolve(__dirname, "..");
// A new consumer prevents npm from reusing an older tarball with the same version.
fs.mkdirSync(path.join(root, ".test-build"), { recursive: true });
const consumer = fs.mkdtempSync(path.join(root, ".test-build/installed-"));
const packages = [
  "wkly-datetime-picker.core",
  "wkly-datetime-picker.adapters",
  "wkly-datetime-picker",
];
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function run(args, cwd = root) {
  return execFileSync(npm, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}
const tarballs = packages.map((name) => {
  execFileSync(process.execPath, ["scripts/build.cjs", name], {
    cwd: root,
    stdio: "inherit",
  });
  const result = JSON.parse(
    run(["pack", "--json"], path.join(root, "dist", name)),
  );
  return path.join(root, "dist", name, result[0].filename);
});
fs.writeFileSync(
  path.join(consumer, "package.json"),
  JSON.stringify({ name: "regression-consumer", private: true }),
);
run(
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--offline",
    ...tarballs,
  ],
  consumer,
);
verifyPackedConsumer({
  consumer,
  dist: path.join(root, "dist"),
  names: packages,
  dependencies: JSON.parse(
    fs.readFileSync(path.join(consumer, "package.json"), "utf8"),
  ).dependencies,
});
const suite = path.join(root, "projects/wkly-datetime-picker.tests/contracts");
(async () => {
  const startup = path.join(consumer, "imports.cjs");
  fs.copyFileSync(
    path.join(root, "projects/wkly-datetime-picker.tests/packages/imports.cjs"),
    startup,
  );
  const startupResult = spawnSync(process.execPath, [startup], {
    cwd: consumer,
    stdio: "inherit",
  });
  if (startupResult.error) throw startupResult.error;
  if (startupResult.status !== 0)
    throw new Error("Packed package startup failed");
  const outputs = [];
  for (const name of fs
    .readdirSync(suite)
    .filter((name) => name.endsWith(".spec.ts"))
    .sort()) {
    const outfile = path.join(consumer, name.replace(/\.ts$/, ".cjs"));
    const bundle = await esbuild.build({
      entryPoints: [path.join(suite, name)],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node16",
      metafile: true,
      plugins: [
        {
          name: "installed-packages",
          setup(build) {
            build.onResolve(
              { filter: /^wkly-datetime-picker(?:\.(?:core|adapters))?$/ },
              (args) => {
                const resolved = require.resolve(args.path, {
                  paths: [consumer],
                });
                if (
                  !resolved.startsWith(
                    path.join(consumer, "node_modules") + path.sep,
                  )
                )
                  throw new Error(
                    "Package escaped installed consumer: " + resolved,
                  );
                return { path: resolved };
              },
            );
          },
        },
      ],
    });
    for (const input of Object.keys(bundle.metafile.inputs)) {
      const resolved = path.resolve(input);
      const relative = path
        .relative(path.join(root, "projects"), resolved)
        .replaceAll("\\", "/");
      if (/^wkly-datetime-picker(?:\.(?:core|adapters))?\//.test(relative))
        throw new Error(
          "Source package leaked into installed contracts: " + input,
        );
    }
    outputs.push(outfile);
  }
  if (!outputs.length) throw new Error("No installed contract suites found");
  for (const TZ of ["UTC", "America/New_York"]) {
    console.log(`Installed contracts: ${TZ}`);
    const result = spawnSync(process.execPath, ["--test", ...outputs], {
      cwd: consumer,
      stdio: "inherit",
      env: { ...process.env, TZ },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = 1;
  }
  console.log("Installed consumer: " + path.relative(root, consumer));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
