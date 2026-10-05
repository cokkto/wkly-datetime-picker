const { execFileSync } = require("child_process");
const supported = require("../supported-angular.json");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
function angularPlugin(ts, configPath, compilerCli, major = 22) {
  return {
    name: "angular-ts",
    setup(build) {
      let emitted = new Map();
      const resources = new Set();
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
          // Angular 11-13 predate the standalone metadata flag used by shared fixtures.
          if (major < 14) source = source.replace(/standalone: false,?/g, "");
          for (const match of source.matchAll(
            /(?:templateUrl:\s*|styleUrls:\s*\[)([^\n]+)/g,
          )) {
            for (const ref of match[1].matchAll(/['"]([^'"]+)['"]/g))
              resources.add(path.resolve(path.dirname(file), ref[1]));
          }
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
        // Signal inputs need Angular's compiler to emit runtime input metadata.
        const program = compilerCli
          ? new compilerCli.NgtscProgram(
              parsed.fileNames,
              {
                ...options,
                enableIvy: true,
                compilationMode: "full",
              },
              host,
            )
          : ts.createProgram(parsed.fileNames, options, host);
        const errors = (
          compilerCli
            ? [
                ...program.getTsOptionDiagnostics(),
                ...program.getTsSyntacticDiagnostics(),
                ...program.getTsSemanticDiagnostics(),
                ...program.getNgOptionDiagnostics(),
                ...program.getNgStructuralDiagnostics(),
                ...program.getNgSemanticDiagnostics(),
              ]
            : ts.getPreEmitDiagnostics(program)
        ).filter((d) => d.category === ts.DiagnosticCategory.Error);
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
            ...resources,
            ...[".html", ".css"]
              .map((ext) => args.path.replace(/\.ts$/, ext))
              .filter((file) => fs.existsSync(file)),
          ],
        };
      });
    },
  };
}

function runtimeDependenciesPlugin(runtimeRoot, routerRoot = runtimeRoot) {
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
            resolveDir:
              args.path === "@angular/router" ? routerRoot : runtimeRoot,
            kind: args.kind,
            pluginData: { runtimeResolved: true },
          });
        },
      );
    },
  };
}

function prepareLegacyAngular() {
  if (!supported["11"]) return;
  // Angular 11 dependencies use View Engine metadata; esbuild needs ngcc's in-place module output.
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules/@angular/compiler-cli/ngcc/main-ngcc.js"),
      "--source",
      path.join(root, "node_modules"),
      "--properties",
      "module",
      "main",
      "--first-only",
      "--loglevel",
      "warn",
    ],
    { cwd: root, stdio: "inherit" },
  );
}

module.exports = {
  angularPlugin,
  runtimeDependenciesPlugin,
  prepareLegacyAngular,
};
