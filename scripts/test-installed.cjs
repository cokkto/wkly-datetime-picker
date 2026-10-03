const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const consumer = path.join(root, ".test-build/installed");
fs.mkdirSync(consumer, { recursive: true });
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
    run(
      ["pack", "--json", "--pack-destination", consumer],
      path.join(root, "dist", name),
    ),
  );
  return path.join(consumer, result[0].filename);
});
fs.writeFileSync(
  path.join(consumer, "package.json"),
  JSON.stringify({ name: "regression-consumer", private: true }),
);
run(
  ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs],
  consumer,
);
const suite = path.join(root, "projects/wkly-datetime-picker.tests/contracts");
(async () => {
  for (const name of fs
    .readdirSync(suite)
    .filter((name) => name.endsWith(".ts"))) {
    const outfile = path.join(consumer, name.replace(/\.ts$/, ".cjs"));
    await esbuild.build({
      entryPoints: [path.join(suite, name)],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node16",
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
    for (const TZ of ["UTC", "America/New_York"]) {
      const result = spawnSync(process.execPath, [outfile], {
        stdio: "inherit",
        env: { ...process.env, TZ },
      });
      if (result.error) console.error(result.error);
      if (result.status !== 0) process.exitCode = 1;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
