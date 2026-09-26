// No dependencies: matrix planning and workspace generation run before install.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const supported = read(path.join(root, "supported-angular.json"));

function rows(metadata = supported) {
  const result = Object.entries(metadata).map(([angular, info]) => {
    if (
      !/^[1-9]\d*$/.test(angular) ||
      info.package !== `wkly-datetime-picker.${angular}`
    )
      throw new Error(`Invalid compatibility package: ${angular}`);
    if (!/^\d+(\.\d+){0,2}$/.test(info.node))
      throw new Error(`Invalid Node version: ${angular}`);
    for (const [name, version] of Object.entries(info.dependencies || {})) {
      if (!/^\d+\.\d+\.\d+$/.test(version))
        throw new Error(`Pin ${name} for Angular ${angular}`);
    }
    for (const name of [
      "@angular/core",
      "@angular/compiler-cli",
      "@angular/cli",
      "@angular-devkit/build-angular",
      "ng-packagr",
      "typescript",
      "rxjs",
      "esbuild",
    ]) {
      if (!/^\d+\.\d+\.\d+$/.test(info.dependencies?.[name]))
        throw new Error(`Pin ${name} for Angular ${angular}`);
    }
    if (info.dependencies["@angular/core"].split(".")[0] !== angular)
      throw new Error(`Angular dependency mismatch: ${angular}`);
    const pkg = read(path.join(root, "projects", info.package, "package.json"));
    if (
      pkg.name !== info.package ||
      !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.version) ||
      pkg.version.split(".")[0] !== angular
    )
      throw new Error(`Package/version mismatch: ${angular}`);
    return { angular, node: info.node };
  });
  if (!result.length) throw new Error("No supported Angular packages");
  for (const entry of fs.readdirSync(path.join(root, "projects"))) {
    if (
      /^wkly-datetime-picker\.\d+$/.test(entry) &&
      !metadata[entry.split(".").pop()]
    )
      throw new Error(`Register ${entry} in supported-angular.json`);
  }
  return result;
}

function affected(files, metadata = supported) {
  const all = rows(metadata);
  if (!files) return all;
  const packages = fs
    .readdirSync(path.join(root, "projects"))
    .filter((name) =>
      fs.existsSync(path.join(root, "projects", name, "package.json")),
    );
  const manifests = Object.fromEntries(
    packages.map((name) => [
      name,
      read(path.join(root, "projects", name, "package.json")),
    ]),
  );
  const changed = new Set();
  for (const file of files) {
    const owner = packages.find((name) => file.startsWith(`projects/${name}/`));
    if (!owner) return all; // Build, tests, metadata, unknown/deleted paths: conservative full run.
    changed.add(owner);
  }
  let grew;
  do {
    grew = false;
    for (const [name, pkg] of Object.entries(manifests)) {
      if (
        !changed.has(name) &&
        Object.keys({
          ...pkg.dependencies,
          ...pkg.peerDependencies,
          ...pkg.devDependencies,
        }).some((dep) => changed.has(dep))
      ) {
        changed.add(name);
        grew = true;
      }
    }
  } while (grew);
  return all.filter(
    (row) =>
      changed.has(metadata[row.angular].package) ||
      files.some((file) =>
        file.startsWith(
          `projects/wkly-datetime-picker.runtime.${row.angular}/`,
        ),
      ),
  );
}

function prepare(major) {
  if (!rows().some((row) => row.angular === major))
    throw new Error(`Unsupported Angular ${major}`);
  const dir = path.join(root, ".compat", major);
  // Never delete a caller-provided path. Only this major's generated workspace.
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const name of [
    "projects",
    "scripts",
    "tests",
    "docs",
    "tsconfig.json",
    "supported-angular.json",
    "LICENSE",
    "README.md",
  ]) {
    fs.cpSync(path.join(root, name), path.join(dir, name), {
      recursive: true,
      filter: (source) =>
        !["node_modules", "e2e"].includes(path.basename(source)),
    });
  }
  write(path.join(dir, "package.json"), {
    name: "wkly-compatibility",
    private: true,
    dependencies: supported[major].dependencies,
  });
  fs.writeFileSync(
    path.join(dir, ".npmrc"),
    "package-lock=true\nstrict-peer-deps=true\naudit=false\nfund=false\n",
  );
  return dir;
}

function run(command, args, cwd, capture = false) {
  return execFileSync(command, args, {
    cwd,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32" && command === "npm",
    env: { ...process.env, NG_CLI_ANALYTICS: "false" },
  });
}

function test(major) {
  if (!supported[major]) throw new Error(`Unsupported Angular ${major}`);
  const dir = path.join(root, ".compat", major);
  if (!fs.existsSync(path.join(dir, "package.json")))
    throw new Error(
      `Run node scripts/compatibility.cjs prepare ${major} with Node 22+ first`,
    );
  if (
    process.versions.node.split(".")[0] !== supported[major].node.split(".")[0]
  )
    throw new Error(`Use Node ${supported[major].node} for Angular ${major}`);
  process.env.WKLY_ANGULAR = major;
  run("npm", ["install"], dir);
  run(process.execPath, ["scripts/test.cjs"], dir);
  run(process.execPath, ["scripts/build.cjs"], dir);
  run(process.execPath, ["scripts/pack.cjs"], dir);
  const consumer = path.join(dir, "consumer");
  fs.mkdirSync(consumer, { recursive: true });
  const dependencies = { ...supported[major].dependencies };
  for (const name of fs.readdirSync(path.join(dir, "dist"))) {
    const packageDir = path.join(dir, "dist", name);
    if (!fs.existsSync(path.join(packageDir, "package.json"))) continue;
    const packed = JSON.parse(
      run("npm", ["pack", "--json"], packageDir, true),
    )[0];
    dependencies[name] = `file:../dist/${name}/${packed.filename}`;
  }
  write(path.join(consumer, "package.json"), {
    name: "wkly-consumer",
    private: true,
    dependencies,
  });
  fs.copyFileSync(path.join(dir, ".npmrc"), path.join(consumer, ".npmrc"));
  run("npm", ["install"], consumer);
  let source = fs
    .readFileSync(path.join(root, "tests/compatibility/main.ts"), "utf8")
    .replaceAll("__PACKAGE__", supported[major].package);
  const entries = [];
  function secondaryEntries(folder, prefix = "") {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;
      const child = path.join(folder, entry.name);
      const subpath = prefix + "/" + entry.name;
      if (fs.existsSync(path.join(child, "ng-package.json")))
        entries.push(supported[major].package + subpath);
      secondaryEntries(child, subpath);
    }
  }
  secondaryEntries(path.join(dir, "projects", supported[major].package));
  source += entries
    .map(
      (entry, i) =>
        `\nimport * as entry${i} from '${entry}';\nif (!Object.keys(entry${i}).length) throw new Error('Empty public entry: ${entry}');`,
    )
    .join("");
  // Angular 19+ defaults declarations to standalone; keep one NgModule harness.
  source = source.replace(
    "/* COMPONENT_OPTIONS */",
    Number(major) >= 14 ? "standalone: false," : "",
  );
  fs.writeFileSync(path.join(consumer, "main.ts"), source);
  fs.writeFileSync(
    path.join(consumer, "index.html"),
    '<!doctype html><html><head><meta charset="utf-8"><base href="/"></head><body><compat-app></compat-app></body></html>',
  );
  write(path.join(consumer, "tsconfig.json"), {
    compilerOptions: {
      target: "es2018",
      module: "es2020",
      moduleResolution: "node",
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
      lib: ["es2020", "dom"],
      types: [],
    },
    angularCompilerOptions: { strictTemplates: true },
    files: ["main.ts"],
  });
  write(path.join(consumer, "angular.json"), {
    version: 1,
    projects: {
      consumer: {
        projectType: "application",
        root: "",
        sourceRoot: "",
        architect: {
          build: {
            builder:
              supported[major].builder ||
              "@angular-devkit/build-angular:browser",
            options: {
              outputPath: "public",
              index: "index.html",
              main: "main.ts",
              tsConfig: "tsconfig.json",
              aot: true,
              optimization: false,
              sourceMap: true,
              progress: false,
            },
          },
        },
      },
    },
  });
  const cli = read(
    path.join(consumer, "node_modules/@angular/cli/package.json"),
  );
  run(
    process.execPath,
    [
      path.join(consumer, "node_modules/@angular/cli", cli.bin.ng),
      "build",
      "consumer",
    ],
    consumer,
  );
  fs.copyFileSync(
    path.join(root, "tests/compatibility/ssr.cjs"),
    path.join(consumer, "ssr.cjs"),
  );
  run(process.execPath, ["ssr.cjs", supported[major].package], consumer);
}

function matrix() {
  let files;
  const event = process.env.GITHUB_EVENT_PATH
    ? read(process.env.GITHUB_EVENT_PATH)
    : {};
  const base =
    event.pull_request?.base.sha ||
    (process.env.GITHUB_EVENT_NAME === "push" ? event.before : undefined);
  if (base && !/^0+$/.test(base)) {
    const head =
      event.pull_request?.head.sha || process.env.GITHUB_SHA || "HEAD";
    const range = event.pull_request ? `${base}...${head}` : `${base}..${head}`;
    files = run(
      "git",
      ["diff", "--name-only", "--no-renames", "-z", range],
      root,
      true,
    )
      .split("\0")
      .filter(Boolean);
  }
  const include = rows();
  const changed = affected(files);
  // Every registered package must pass the browser and consumer contracts on
  // every CI run. Keep the affected set for release planning and diagnostics.
  const output = `matrix=${JSON.stringify({ include })}\nhas-packages=${include.length > 0}\naffected=${JSON.stringify(changed.map((row) => row.angular))}\n`;
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}

module.exports = { rows, affected };
if (require.main === module) {
  const [command, major] = process.argv.slice(2);
  if (command === "matrix") matrix();
  else if (command === "prepare") prepare(major);
  else if (command === "test") test(major);
  else
    throw new Error(
      "Usage: compatibility.cjs matrix | prepare <major> | test <major>",
    );
}
