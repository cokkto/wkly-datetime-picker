const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const supported = require("../supported-angular.json");
const root = path.resolve(__dirname, "..");
const hostRoot = path.join(root, "projects/wkly-datetime-picker.showcase");
const hostRequire = createRequire(path.join(hostRoot, "package.json"));

function angularPlugin(ts, configPath) {
  return {
    name: "angular-ts",
    setup(build) {
      let emitted = new Map();
      build.onStart(() => {
        emitted = new Map();
        const config = ts.readConfigFile(configPath, ts.sys.readFile);
        if (config.error)
          throw new Error(
            ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
          );
        const parsed = ts.parseJsonConfigFileContent(
          config.config,
          ts.sys,
          path.dirname(configPath),
        );
        const options = {
          ...parsed.options,
          noEmit: false,
          declaration: false,
          sourceMap: false,
        };
        const host = ts.createCompilerHost(options);
        const originalRead = host.readFile;
        host.readFile = (file) => {
          let source = originalRead(file);
          if (!source || file.includes("node_modules") || !file.endsWith(".ts"))
            return source;
          source = source.replace(
            /templateUrl:\s*(['"])([^'"]+)\1/g,
            (_, quote, ref) =>
              "template: " +
              JSON.stringify(
                fs.readFileSync(path.resolve(path.dirname(file), ref), "utf8"),
              ),
          );
          return source.replace(
            /styleUrls:\s*\[([^\]]+)\]/g,
            (_, files) =>
              "styles: [" +
              [...files.matchAll(/(['"])([^'"]+)\1/g)]
                .map((m) =>
                  JSON.stringify(
                    fs.readFileSync(
                      path.resolve(path.dirname(file), m[2]),
                      "utf8",
                    ),
                  ),
                )
                .join(",") +
              "]",
          );
        };
        host.writeFile = (file, contents) =>
          emitted.set(
            path.resolve(file).replace(/\.js$/, ".ts").toLowerCase(),
            contents,
          );
        const program = ts.createProgram(parsed.fileNames, options, host);
        const errors = ts
          .getPreEmitDiagnostics(program)
          .filter((d) => d.category === ts.DiagnosticCategory.Error);
        if (errors.length)
          throw new Error(
            ts.formatDiagnosticsWithColorAndContext(errors, {
              getCurrentDirectory: ts.sys.getCurrentDirectory,
              getCanonicalFileName: (file) => file,
              getNewLine: () => "\n",
            }),
          );
        program.emit();
      });
      build.onLoad({ filter: /\.ts$/ }, (args) => {
        if (args.path.includes("node_modules")) return;
        const contents = emitted.get(args.path.toLowerCase());
        if (contents === undefined)
          throw new Error("TypeScript did not emit " + args.path);
        return {
          contents,
          loader: "js",
          resolveDir: path.dirname(args.path),
          watchFiles: [
            args.path,
            ...[".html", ".css"]
              .map((ext) => args.path.replace(/\.ts$/, ext))
              .filter((file) => fs.existsSync(file)),
          ],
        };
      });
    },
  };
}

function runtimeDependenciesPlugin(runtimeRoot) {
  return {
    name: "runtime-dependencies",
    setup(build) {
      build.onResolve(
        {
          filter:
            /^(@angular\/|rxjs(?:\/|$)|zone\.js(?:\/|$)|tslib(?:\/|$)|reflect-metadata$)/,
        },
        (args) => {
          if (args.pluginData?.runtimeResolved) return;
          return build.resolve(args.path, {
            resolveDir: runtimeRoot,
            kind: args.kind,
            pluginData: { runtimeResolved: true },
          });
        },
      );
    },
  };
}

const majors = Object.keys(supported).sort((a, b) => Number(a) - Number(b));
const angularOption = process.argv.find((arg) => arg.startsWith("--angular="));
const angularIndex = process.argv.indexOf("--angular");
const initialAngular = angularOption
  ? angularOption.slice("--angular=".length)
  : angularIndex >= 0
    ? process.argv[angularIndex + 1]
    : majors[majors.length - 1];
if (!majors.includes(initialAngular))
  throw new Error(
    `Unsupported Angular ${initialAngular}; choose ${majors.join(", ")}`,
  );
const hostEsbuild = hostRequire("esbuild");
const builds = [
  {
    esbuild: hostEsbuild,
    options: {
      absWorkingDir: root,
      entryPoints: ["projects/wkly-datetime-picker.showcase/src/main.ts"],
      outdir: "dist/showcase",
      bundle: true,
      format: "iife",
      sourcemap: true,
      target: "es2022",
      tsconfig: "projects/wkly-datetime-picker.showcase/tsconfig.host.json",
      plugins: [
        angularPlugin(
          hostRequire("typescript"),
          path.join(hostRoot, "tsconfig.host.json"),
        ),
      ],
      define: {
        WKLY_RUNTIME_VERSIONS: JSON.stringify(majors),
        WKLY_INITIAL_ANGULAR: JSON.stringify(initialAngular),
      },
    },
  },
];
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
      outdir: `dist/showcase/runtime/${major}`,
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
        ),
      ],
      define: { WKLY_E2E: process.env.WKLY_E2E === "1" ? "true" : "false" },
    },
  });
}

function assets() {
  fs.mkdirSync(path.join(root, "dist/showcase"), { recursive: true });
  fs.copyFileSync(
    path.join(hostRoot, "src/index.html"),
    path.join(root, "dist/showcase/index.html"),
  );
  for (const major of majors) {
    const output = path.join(root, "dist/showcase/runtime", major);
    fs.mkdirSync(output, { recursive: true });
    fs.copyFileSync(
      path.join(root, supported[major].runtimeHtml),
      path.join(output, "index.html"),
    );
  }
}

module.exports = { assets, builds, majors };
if (require.main === module) {
  assets();
  Promise.all(
    builds.map(({ esbuild, options }) => esbuild.build(options)),
  ).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
