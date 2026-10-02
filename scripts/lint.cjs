const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { pathToFileURL } = require("url");

const root = path.resolve(__dirname, "..");
const supported = require("../supported-angular.json");
const skipDirectories = new Set(["node_modules", "dist", "baselines"]);

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
      return skipDirectories.has(entry.name) ? [] : filesIn(file);
    return entry.isFile() && /\.(?:ts|cjs|component\.html)$/.test(entry.name)
      ? [file]
      : [];
  });
}

function report(file, line, column, rule, message) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  process.stderr.write(`${relative}:${line}:${column} ${rule}: ${message}\n`);
  return 1;
}

function lintScript(
  file,
  ts,
  source = fs.readFileSync(file, "utf8"),
  compiler,
) {
  const kind = file.endsWith(".cjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  let errors = 0;
  const issue = (position, rule, message) => {
    const location = parsed.getLineAndCharacterOfPosition(position);
    errors += report(
      file,
      location.line + 1,
      location.character + 1,
      rule,
      message,
    );
  };
  for (const diagnostic of parsed.parseDiagnostics)
    issue(
      diagnostic.start || 0,
      "syntax",
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
    );
  function visit(node) {
    if (ts.isDebuggerStatement(node))
      issue(
        node.getStart(parsed),
        "no-debugger",
        "Remove the debugger statement.",
      );
    if (
      ts.isVariableDeclarationList(node) &&
      !(node.flags & ts.NodeFlags.BlockScoped)
    )
      issue(node.getStart(parsed), "no-var", "Use let or const.");
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "eval"
    )
      issue(node.getStart(parsed), "no-eval", "Avoid direct eval calls.");
    if (
      compiler &&
      ts.isDecorator(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Component" &&
      node.expression.arguments.length > 0 &&
      ts.isObjectLiteralExpression(node.expression.arguments[0])
    ) {
      for (const property of node.expression.arguments[0].properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          property.name.text !== "template" ||
          !(
            ts.isStringLiteral(property.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(property.initializer)
          )
        )
          continue;
        const template = compiler.parseTemplate(
          property.initializer.text,
          file,
        );
        for (const error of template.errors || [])
          issue(
            property.initializer.getStart(parsed) + 1 + error.span.start.offset,
            "template",
            error.msg,
          );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return errors;
}

function lintTemplate(file, compiler, source = fs.readFileSync(file, "utf8")) {
  const parsed = compiler.parseTemplate(source, file);
  let errors = 0;
  for (const error of parsed.errors || []) {
    const start = error.span.start;
    errors += report(
      file,
      start.line + 1,
      start.col + 1,
      "template",
      error.msg,
    );
  }
  return errors;
}

async function toolchain(major) {
  const project = path.join(root, "projects", supported[major].package);
  const localRequire = createRequire(path.join(project, "package.json"));
  const ts = localRequire("typescript");
  const compilerPath = localRequire.resolve("@angular/compiler");
  const compiler = compilerPath.endsWith(".mjs")
    ? await import(pathToFileURL(compilerPath).href)
    : localRequire("@angular/compiler");
  const actualAngular = localRequire("@angular/compiler/package.json").version;
  const actualTypeScript = localRequire("typescript/package.json").version;
  const expectedTypeScript = supported[major].dependencies.typescript;
  if (
    !actualAngular.startsWith(`${major}.`) ||
    actualTypeScript !== expectedTypeScript
  )
    throw new Error(
      `Angular ${major} lint needs Angular ${major} and TypeScript ${expectedTypeScript}; found ${actualAngular} and ${actualTypeScript}. Run corepack pnpm install.`,
    );
  return { ts, compiler };
}

async function main() {
  const arg = process.argv[2];
  const selected = arg?.match(/^--angular=(\d+)$/)?.[1];
  if (
    process.argv.length > 3 ||
    (arg && !selected) ||
    (selected && !supported[selected])
  )
    throw new Error(
      "Usage: node scripts/lint.cjs [--angular=<supported major>]",
    );

  let errors = 0;
  let checked = 0;
  const majors = selected
    ? [selected]
    : Object.keys(supported).sort((a, b) => Number(a) - Number(b));
  for (const major of majors) {
    const { ts, compiler } = await toolchain(major);
    const projects = [
      supported[major].package,
      `wkly-datetime-picker.runtime.${major}`,
    ];
    for (const name of projects) {
      const files = filesIn(path.join(root, "projects", name));
      for (const file of files) {
        errors += file.endsWith(".component.html")
          ? lintTemplate(file, compiler)
          : lintScript(file, ts, undefined, compiler);
        checked++;
      }
    }
    process.stdout.write(
      `Angular ${major}: linted ${projects.join(" and ")}\n`,
    );
  }

  if (!selected) {
    const { ts: oldest } = await toolchain(majors[0]);
    const { ts: newest, compiler } = await toolchain(majors[majors.length - 1]);
    for (const name of [
      "wkly-datetime-picker.core",
      "wkly-datetime-picker.adapters",
      "wkly-datetime-picker",
      "wkly-datetime-picker.runtime",
    ]) {
      for (const file of filesIn(path.join(root, "projects", name))) {
        errors += lintScript(file, oldest);
        checked++;
      }
    }
    for (const file of filesIn(
      path.join(root, "projects/wkly-datetime-picker.showcase"),
    )) {
      errors += file.endsWith(".component.html")
        ? lintTemplate(file, compiler)
        : lintScript(file, newest, undefined, compiler);
      checked++;
    }
    for (const directory of ["scripts", "tests"]) {
      for (const file of filesIn(path.join(root, directory))) {
        errors += lintScript(
          file,
          file.endsWith("contracts.ts") ? oldest : newest,
        );
        checked++;
      }
    }
    errors += lintScript(path.join(root, "playwright.config.ts"), newest);
    checked++;
  }
  process.stdout.write(`Linted ${checked} files; ${errors} error(s).\n`);
  if (errors) process.exitCode = 1;
}

if (require.main === module)
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });

module.exports = { lintScript, lintTemplate, toolchain };
