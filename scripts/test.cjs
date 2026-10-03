const esbuild = require("esbuild");
const { spawnSync } = require("child_process");
const fs = require("fs");
const root = "projects/wkly-datetime-picker.tests";
esbuild.buildSync({
  entryPoints: [
    root + "/contracts.ts",
    ...fs
      .readdirSync(root + "/contracts")
      .filter((name) => name.endsWith(".ts"))
      .map((name) => root + "/contracts/" + name),
  ],
  outdir: ".test-build",
  outbase: root,
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node16",
  nodePaths: (process.env.NODE_PATH || "")
    .split(require("path").delimiter)
    .filter(Boolean),
});
for (const TZ of ["UTC", "America/New_York"]) {
  for (const file of [
    "contracts.cjs",
    ...fs
      .readdirSync(root + "/contracts")
      .filter((name) => name.endsWith(".ts"))
      .map((name) => "contracts/" + name.replace(/\.ts$/, ".cjs")),
  ]) {
    const result = spawnSync(process.execPath, [".test-build/" + file], {
      stdio: "inherit",
      env: { ...process.env, TZ },
    });
    if (result.error) console.error(result.error);
    if (result.status !== 0) process.exitCode = 1;
  }
}
