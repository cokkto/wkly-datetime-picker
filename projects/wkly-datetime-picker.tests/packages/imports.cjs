// Copied into the installed consumer so both loaders resolve its tarballs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const Module = require("node:module");
const packages = [
  "wkly-datetime-picker.core",
  "wkly-datetime-picker.adapters",
  "wkly-datetime-picker",
];
const original = Module._load;
Module._load = function (name) {
  if (name.startsWith("@angular/") || name === "rxjs")
    throw new Error("Framework dependency in shared package: " + name);
  return original.apply(this, arguments);
};
(async () => {
  for (const name of packages) {
    const folder = path.join(__dirname, "node_modules", name);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(folder, "package.json"), "utf8"),
    );
    const commonjs = require(name);
    assert(Object.keys(commonjs).length, `${name}: empty CommonJS exports`);
    // Import the declared ESM entry as well as Node's bare-package resolution.
    const esm = await import(
      pathToFileURL(path.join(folder, manifest.module)).href
    );
    assert.deepEqual(
      Object.keys(esm).sort(),
      Object.keys(commonjs).sort(),
      `${name}: ESM/CommonJS export mismatch`,
    );
    const imported = await import(name);
    assert(Object.keys(imported).length, `${name}: empty dynamic import`);
    assert(
      fs
        .statSync(path.join(folder, manifest.types || manifest.typings))
        .isFile(),
      `${name}: missing declarations`,
    );
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    }))
      assert(
        !dependency.startsWith("@angular/") && dependency !== "rxjs",
        `${name}: framework dependency`,
      );
  }
  console.log(
    "PASS installed CommonJS, ESM, dynamic imports and declaration entries",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    Module._load = original;
  });
