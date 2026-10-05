const esbuild = require("esbuild");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "projects/wkly-datetime-picker.tests/contracts");
const output = path.join(root, ".test-build/pure-contracts");
const files = fs
  .readdirSync(source)
  .filter((name) => name.endsWith(".spec.ts"))
  .sort();
if (!files.length) throw new Error("No pure contract suites found");
esbuild.buildSync({
  entryPoints: files.map((name) => path.join(source, name)),
  outdir: output,
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node16",
  tsconfig: path.join(root, "tsconfig.json"),
  nodePaths: (process.env.NODE_PATH || "")
    .split(path.delimiter)
    .filter(Boolean),
});
// Shared contracts have no Angular runtime dependency. Build once and vary
// only the process timezone; execute only this run's discovered entries.
for (const TZ of ["UTC", "America/New_York"]) {
  console.log(`Pure contracts: ${TZ}`);
  const result = spawnSync(
    process.execPath,
    [
      "--test",
      ...files.map((name) => path.join(output, name.replace(/\.ts$/, ".cjs"))),
    ],
    { cwd: root, stdio: "inherit", env: { ...process.env, TZ } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
}
