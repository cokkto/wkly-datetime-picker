const fs = require("node:fs");
const path = require("node:path");

const shared = {
  "wkly-datetime-picker.core": "@wkly/core",
  "wkly-datetime-picker.adapters": "@wkly/adapters",
  "wkly-datetime-picker": "@wkly/presentation",
};
const picker = "@wkly/datetime-picker";
const publicName = (name) =>
  shared[name] || (/^wkly-datetime-picker\.\d+$/.test(name) ? picker : name);
const packageDirs = (major) =>
  Object.fromEntries(
    [
      ...Object.keys(shared),
      ...(major ? [`wkly-datetime-picker.${major}`] : []),
    ].map((name) => [publicName(name), name]),
  );

function rewriteImports(source, names) {
  // Package names also occur as component selectors. Only module specifiers change.
  return source.replace(
    /(\bfrom\s*|\b(?:import|require)\s*\(\s*|\bimport\s*)(["'])([^"'\r\n]+)\2/g,
    (match, prefix, quote, specifier) => {
      for (const [internal, outgoing] of Object.entries(names)) {
        if (specifier === internal || specifier.startsWith(internal + "/"))
          return (
            prefix + quote + outgoing + specifier.slice(internal.length) + quote
          );
      }
      return match;
    },
  );
}

function preparePublicSources(workspace, major) {
  const names = {
    ...shared,
    ...(major ? { [`wkly-datetime-picker.${major}`]: picker } : {}),
  };
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const write = (file, value) =>
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  function rewritePaths(config) {
    for (const [internal, outgoing] of Object.entries(names)) {
      for (const key of Object.keys(config.compilerOptions?.paths || {}))
        if (key === internal || key.startsWith(internal + "/")) {
          config.compilerOptions.paths[outgoing + key.slice(internal.length)] =
            config.compilerOptions.paths[key];
          delete config.compilerOptions.paths[key];
        }
    }
  }
  const versions = Object.fromEntries(
    Object.keys(names).map((name) => [
      name,
      read(path.join(workspace, "projects", name, "package.json")).version,
    ]),
  );
  for (const [internal, outgoing] of Object.entries(names)) {
    const project = path.join(workspace, "projects", internal);
    const file = path.join(project, "package.json");
    const manifest = read(file);
    if (manifest.name !== internal)
      throw new Error(`Expected internal source manifest: ${internal}`);
    manifest.name = outgoing;
    manifest.repository = {
      type: "git",
      url: "git+https://github.com/cokkto/wkly-datetime-picker.git",
      directory: `projects/${internal}`,
    };
    manifest.homepage = "https://github.com/cokkto/wkly-datetime-picker#readme";
    manifest.bugs = {
      url: "https://github.com/cokkto/wkly-datetime-picker/issues",
    };
    manifest.publishConfig = {
      access: "public",
      registry: "https://registry.npmjs.org/",
    };
    for (const field of [
      "dependencies",
      "peerDependencies",
      "optionalDependencies",
    ])
      if (manifest[field])
        manifest[field] = Object.fromEntries(
          Object.entries(manifest[field]).map(([name, version]) => [
            names[name] || name,
            names[name] ? versions[name] : version,
          ]),
        );
    write(file, manifest);
    function visit(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue;
        const child = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(child);
        else if (entry.name.endsWith(".ts"))
          fs.writeFileSync(
            child,
            rewriteImports(fs.readFileSync(child, "utf8"), names),
          );
        else if (entry.name === "tsconfig.lib.json") {
          const config = read(child);
          rewritePaths(config);
          write(child, config);
        } else if (entry.name === "ng-package.json") {
          const config = read(child);
          if (config.allowedNonPeerDependencies)
            config.allowedNonPeerDependencies =
              config.allowedNonPeerDependencies.map(
                (name) => names[name] || name,
              );
          write(child, config);
        }
      }
    }
    visit(project);
  }
  const file = path.join(workspace, "tsconfig.json");
  const config = read(file);
  rewritePaths(config);
  write(file, config);
  // Every Angular line builds the same shared declarations with TypeScript 4.1.
  delete config.compilerOptions.ignoreDeprecations;
  write(path.join(workspace, "tsconfig.shared.json"), config);
}

function copySharedWorkspace(root, workspace) {
  for (const file of [
    "tsconfig.json",
    "supported-angular.json",
    "LICENSE",
    "README.md",
    "docs/API.md",
    "scripts/build.cjs",
  ])
    fs.cpSync(path.join(root, file), path.join(workspace, file));
  for (const name of Object.keys(shared))
    fs.cpSync(
      path.join(root, "projects", name),
      path.join(workspace, "projects", name),
      {
        recursive: true,
        filter: (source) => path.basename(source) !== "node_modules",
      },
    );
  preparePublicSources(workspace);
}

module.exports = {
  shared,
  picker,
  publicName,
  packageDirs,
  rewriteImports,
  preparePublicSources,
  copySharedWorkspace,
};
