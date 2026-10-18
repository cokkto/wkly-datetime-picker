const { execFileSync } = require("child_process");
const supported = require("../supported-angular.json");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
function inlineComponentResources(ts, file, source, resources) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const components = new Set();
  const namespaces = new Set();
  for (const statement of tree.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier.text !== "@angular/core"
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings))
      namespaces.add(bindings.name.text);
    else if (bindings && ts.isNamedImports(bindings))
      for (const binding of bindings.elements)
        if ((binding.propertyName || binding.name).text === "Component")
          components.add(binding.name.text);
  }
  const edits = [];
  const readResource = (ref) => {
    const resource = path.resolve(path.dirname(file), ref.text);
    resources.add(resource);
    return JSON.stringify(fs.readFileSync(resource, "utf8"));
  };
  function visit(node) {
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      const callee = call.expression;
      const isComponent =
        (ts.isIdentifier(callee) && components.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          namespaces.has(callee.expression.text) &&
          callee.name.text === "Component");
      const metadata = call.arguments[0];
      if (isComponent && metadata && ts.isObjectLiteralExpression(metadata)) {
        for (const property of metadata.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = property.name;
          if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) continue;
          const value = property.initializer;
          let replacement;
          if (name.text === "templateUrl" && ts.isStringLiteralLike(value))
            replacement = "template: " + readResource(value);
          if (
            name.text === "styleUrls" &&
            ts.isArrayLiteralExpression(value) &&
            value.elements.every(ts.isStringLiteralLike)
          )
            replacement =
              "styles: [" + value.elements.map(readResource).join(",") + "]";
          if (replacement !== undefined)
            edits.push([property.getStart(tree), property.end, replacement]);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  // Replace only metadata spans, preserving sample strings, comments and source formatting.
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, start) + replacement + source.slice(end);
  return source;
}

function angularPlugin(ts, configPath, compilerCli, major = 22) {
  return {
    name: "angular-ts",
    setup(build) {
      let emitted = new Map();
      const resources = new Set();
      build.onStart(() => {
        emitted = new Map();
        resources.clear();
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
          return inlineComponentResources(ts, file, source, resources);
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
