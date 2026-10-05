const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createRequire } = require("module");
const { performance } = require("perf_hooks");
const {
  angularPlugin,
  runtimeDependenciesPlugin,
  prepareLegacyAngular,
} = require("./angular-build.cjs");
const { majors } = require("./test-host-selection.cjs");
const root = path.resolve(__dirname, "..");
async function buildHosts() {
  const start = performance.now();
  const timings = {};
  if (majors.includes("11")) prepareLegacyAngular();
  for (const major of majors) {
    const started = performance.now();
    const runtime = path.join(
      root,
      `projects/wkly-datetime-picker.runtime.${major}`,
    );
    const runtimeRequire = createRequire(path.join(runtime, "package.json"));
    const compilerRequire = createRequire(
      path.join(root, `projects/wkly-datetime-picker.${major}/package.json`),
    );
    if (major === "12") {
      execFileSync(
        process.execPath,
        [
          path.join(
            path.dirname(
              compilerRequire.resolve("@angular/compiler-cli/package.json"),
            ),
            "ngcc/main-ngcc.js",
          ),
          "--source",
          path.join(runtime, "node_modules"),
          "--properties",
          "es2015",
          "module",
          "main",
          "--first-only",
          "--loglevel",
          "warn",
        ],
        { cwd: root, stdio: "inherit" },
      );
    }
    const directory = path.join(root, ".test-build/hosts", major);
    const outdir = path.join(root, "dist/test-hosts", major);
    fs.mkdirSync(directory, { recursive: true });
    fs.mkdirSync(outdir, { recursive: true });
    const inherited = JSON.parse(
      fs.readFileSync(path.join(runtime, "tsconfig.json"), "utf8"),
    );
    const config = path.join(directory, "tsconfig.json");
    // Modern Angular moved declarations behind package exports. A wildcard
    // directory alias alone can silently fall back to the root Angular 11 types.
    const angularTypes = {};
    const runtimePackage = JSON.parse(
      fs.readFileSync(path.join(runtime, "package.json"), "utf8"),
    );
    for (const dependency of Object.keys(runtimePackage.dependencies).filter(
      (name) => name.startsWith("@angular/"),
    )) {
      const manifestPath = runtimeRequire.resolve(`${dependency}/package.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      for (const [entry, conditions] of Object.entries(
        manifest.exports || {},
      )) {
        if (conditions.types)
          angularTypes[dependency + (entry === "." ? "" : entry.slice(1))] = [
            path.resolve(path.dirname(manifestPath), conditions.types),
          ];
      }
    }
    const lifecycle = path.join(directory, "lifecycle.ts");
    fs.writeFileSync(
      lifecycle,
      'import { Type, ViewContainerRef, NgModuleRef } from "@angular/core"; export function createFixture<T>(container: ViewContainerRef, type: Type<T>, module: NgModuleRef<unknown>) { return ' +
        (Number(major) >= 13
          ? "container.createComponent(type, {injector: module.injector});"
          : "container.createComponent(module.componentFactoryResolver.resolveComponentFactory(type), undefined, module.injector);") +
        " }" +
        (Number(major) >= 21
          ? ' import { provideZoneChangeDetection } from "@angular/core"; export const hostProviders = [provideZoneChangeDetection()];'
          : " export const hostProviders = [];"),
    );
    fs.writeFileSync(
      config,
      JSON.stringify({
        extends: path.join(root, "tsconfig.json"),
        compilerOptions: {
          ...inherited.compilerOptions,
          paths: {
            ...inherited.compilerOptions.paths,
            ...angularTypes,
            "wkly-host-lifecycle": [lifecycle],
            "wkly-overlay-under-test": [
              `projects/wkly-datetime-picker.${major}/cdk-overlay/public-api.ts`,
            ],
            "wkly-picker-under-test": [
              `projects/wkly-datetime-picker.${major}/src/public-api.ts`,
            ],
          },
        },
        files: [
          path.join(root, "projects/wkly-datetime-picker.tests/host/main.ts"),
          path.join(
            root,
            "projects/wkly-datetime-picker.tests/host/assets.d.ts",
          ),
        ],
        include: [],
        exclude: [],
      }),
    );
    const bundle = await runtimeRequire("esbuild").build({
      metafile: true,
      absWorkingDir: root,
      entryPoints: ["projects/wkly-datetime-picker.tests/host/main.ts"],
      outdir,
      bundle: true,
      format: "esm",
      splitting: true,
      target: "es2018",
      tsconfig: config,
      plugins: [
        runtimeDependenciesPlugin(runtime),
        angularPlugin(
          runtimeRequire("typescript"),
          config,
          Number(major) >= 18
            ? compilerRequire("@angular/compiler-cli")
            : undefined,
          Number(major),
        ),
      ],
    });
    fs.writeFileSync(
      path.join(directory, "bundle.json"),
      JSON.stringify(bundle.metafile),
    );
    fs.writeFileSync(
      path.join(outdir, "presentations.css"),
      [
        path.join(
          path.dirname(runtimeRequire.resolve("@angular/cdk/package.json")),
          "overlay-prebuilt.css",
        ),
        path.join(
          path.dirname(
            runtimeRequire.resolve("@angular/material/package.json"),
          ),
          "prebuilt-themes/indigo-pink.css",
        ),
      ]
        .map((file) => fs.readFileSync(file, "utf8"))
        .join("\n"),
    );
    fs.writeFileSync(
      path.join(outdir, "index.html"),
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="main.css"><link rel="stylesheet" href="presentations.css"></head><body><test-host></test-host><script type="module" src="main.js"></script></body></html>',
    );
    timings[major] = performance.now() - started;
  }
  const result = { totalMs: performance.now() - start, majors: timings };
  fs.writeFileSync(
    path.join(root, ".test-build/hosts/build.json"),
    JSON.stringify(result, null, 2),
  );
  return result;
}
module.exports = { buildHosts, majors };
if (require.main === module)
  buildHosts()
    .then(console.log)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
