const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const supported = require("../supported-angular.json");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.WKLY_OUTPUT || "dist/showcase");
const hostRoot = path.join(root, "projects/wkly-datetime-picker.showcase");

const {
  angularPlugin,
  runtimeDependenciesPlugin,
  prepareLegacyAngular,
} = require("./angular-build.cjs");

const majors = Object.keys(supported).sort((a, b) => Number(a) - Number(b));
const builds = [];
for (const major of majors) {
  const info = supported[major];
  const runtimeRoot = path.join(
    root,
    `projects/wkly-datetime-picker.runtime.${major}`,
  );
  const runtimeRequire = createRequire(path.join(runtimeRoot, "package.json"));
  builds.push({
    esbuild: runtimeRequire("esbuild"),
    options: {
      absWorkingDir: root,
      entryPoints: [info.runtimeEntry],
      outdir: path.join(output, "runtime", major),
      bundle: true,
      format: "iife",
      sourcemap: true,
      target: "es2018",
      conditions: ["style"],
      tsconfig: `projects/wkly-datetime-picker.runtime.${major}/tsconfig.json`,
      plugins: [
        runtimeDependenciesPlugin(runtimeRoot),
        angularPlugin(
          runtimeRequire("typescript"),
          path.join(runtimeRoot, "tsconfig.json"),
          Number(major) >= 18
            ? createRequire(
                path.join(
                  root,
                  `projects/wkly-datetime-picker.${major}/package.json`,
                ),
              )("@angular/compiler-cli")
            : undefined,
          Number(major),
        ),
      ],
      define: {
        WKLY_E2E: process.env.WKLY_E2E === "1" ? "true" : "false",
        WKLY_ANGULAR: JSON.stringify(major),
      },
    },
  });
}

// The catalogue renders the latest runtime directly, using that runtime's compiler.
const latest = majors[majors.length - 1];
const latestBuild = builds[builds.length - 1];
const latestRoot = path.join(
  root,
  `projects/wkly-datetime-picker.runtime.${latest}`,
);
const latestRequire = createRequire(path.join(latestRoot, "package.json"));
const hostConfig = path.join(hostRoot, "tsconfig.host.json");
builds.unshift({
  esbuild: latestBuild.esbuild,
  options: {
    ...latestBuild.options,
    entryPoints: ["projects/wkly-datetime-picker.showcase/src/main.ts"],
    outdir: output,
    tsconfig: hostConfig,
    plugins: [
      runtimeDependenciesPlugin(latestRoot, hostRoot),
      angularPlugin(
        latestRequire("typescript"),
        hostConfig,
        createRequire(
          path.join(
            root,
            `projects/wkly-datetime-picker.${latest}/package.json`,
          ),
        )("@angular/compiler-cli"),
      ),
    ],
    define: {
      ...latestBuild.options.define,
      WKLY_RUNTIME_VERSIONS: JSON.stringify(majors),
    },
  },
});

function assets() {
  fs.mkdirSync(output, { recursive: true });
  fs.copyFileSync(
    path.join(hostRoot, "src/index.html"),
    path.join(output, "index.html"),
  );
  for (const major of majors) {
    const runtimeOutput = path.join(output, "runtime", major);
    fs.mkdirSync(runtimeOutput, { recursive: true });
    fs.copyFileSync(
      path.join(root, supported[major].runtimeHtml),
      path.join(runtimeOutput, "index.html"),
    );
  }
}

module.exports = { assets, builds, majors, prepareLegacyAngular };
if (require.main === module) {
  prepareLegacyAngular();
  assets();
  Promise.all(
    builds.map(({ esbuild, options }) => esbuild.build(options)),
  ).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
