const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const entryFields = [
  "main",
  "module",
  "types",
  "typings",
  "es2015",
  "esm2015",
  "fesm2015",
  "esm2020",
  "fesm2020",
  "esm2022",
  "fesm2022",
  "metadata",
];

function checkEntryPaths(manifest, entryDir, packageDir, requireTypes = true) {
  const references = entryFields
    .map((field) => manifest[field])
    .filter(Boolean);
  function exportsIn(value) {
    if (typeof value === "string") {
      if (value.startsWith("./")) references.push(value);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) exportsIn(child);
    }
  }
  exportsIn(manifest.exports);
  for (const reference of references) {
    const file = path.resolve(entryDir, reference);
    assert.ok(
      file.startsWith(packageDir + path.sep) &&
        fs.existsSync(file) &&
        fs.statSync(file).isFile(),
      `Missing or escaped package entry: ${manifest.name} ${reference}`,
    );
  }
  const primary = manifest.exports?.["."];
  assert.ok(
    manifest.main || manifest.module || primary?.default,
    `Missing JavaScript entry: ${manifest.name}`,
  );
  if (requireTypes)
    assert.ok(
      manifest.types || manifest.typings || primary?.types,
      `Missing declaration entry: ${manifest.name || entryDir}`,
    );
}

function verifyPackedConsumer({
  consumer,
  dist,
  names,
  dependencies,
  cdkVersion = null,
  packageDirs = {},
}) {
  const lock = read(path.join(consumer, "package-lock.json"));
  const expectedEntries = new Set(names.map((name) => `node_modules/${name}`));
  for (const entry of Object.keys(lock.packages)) {
    if (
      /(?:^|\/)node_modules\/(?:wkly-datetime-picker(?:\.|$)|@wkly\/)/.test(
        entry,
      )
    )
      assert.ok(
        expectedEntries.has(entry),
        `Unexpected WKLY install: ${entry}`,
      );
  }
  for (const name of names) {
    const spec = dependencies[name];
    assert.ok(spec?.startsWith("file:"), `Not a local tarball: ${name}`);
    assert.equal(lock.packages[""].dependencies[name], spec);
    const tarball = path.resolve(consumer, spec.slice(5));
    const distDir = path.resolve(dist, packageDirs[name] || name);
    assert.equal(path.dirname(tarball), distDir, `Wrong tarball path: ${name}`);
    const packed = read(path.join(distDir, "package.json"));
    const installedDir = path.join(consumer, "node_modules", name);
    assert.ok(
      !fs.lstatSync(installedDir).isSymbolicLink(),
      `Linked package: ${name}`,
    );
    const installed = read(path.join(installedDir, "package.json"));
    const entry = lock.packages[`node_modules/${name}`];
    assert.equal(entry?.resolved, spec, `Wrong lockfile source: ${name}`);
    assert.equal(
      entry.version,
      packed.version,
      `Wrong locked version: ${name}`,
    );
    assert.equal(
      entry.integrity,
      "sha512-" +
        createHash("sha512").update(fs.readFileSync(tarball)).digest("base64"),
      `Tarball integrity mismatch: ${name}`,
    );
    assert.equal(installed.name, packed.name, `Wrong installed name: ${name}`);
    assert.equal(
      installed.version,
      packed.version,
      `Wrong installed version: ${name}`,
    );
    for (const field of [
      "dependencies",
      "peerDependencies",
      "peerDependenciesMeta",
    ])
      assert.deepEqual(installed[field], packed[field], `${name} ${field}`);
    for (const version of Object.values({
      ...packed.dependencies,
      ...packed.peerDependencies,
      ...packed.optionalDependencies,
    }))
      assert.ok(
        !/^(?:file:|link:|workspace:|\.\.?\/|[A-Za-z]:[\\/])/.test(version),
        `Workspace dependency in ${name}: ${version}`,
      );
    checkEntryPaths(packed, distDir, distDir);
    checkEntryPaths(packed, installedDir, installedDir);
    for (const file of ["LICENSE", "README.md", "API.md"]) {
      assert.ok(fs.existsSync(path.join(distDir, file)), `${name}: ${file}`);
      assert.ok(
        fs.existsSync(path.join(installedDir, file)),
        `${name}: ${file}`,
      );
    }
    const secondary = path.join(distDir, "cdk-overlay", "package.json");
    if (fs.existsSync(secondary)) {
      const manifest = read(secondary);
      const requireSecondaryTypes = !packed.exports?.["./cdk-overlay"]?.types;
      checkEntryPaths(
        manifest,
        path.dirname(secondary),
        distDir,
        requireSecondaryTypes,
      );
      checkEntryPaths(
        manifest,
        path.join(installedDir, "cdk-overlay"),
        installedDir,
        requireSecondaryTypes,
      );
    } else if (/\.\d+$/.test(name) || name === "@wkly/datetime-picker") {
      assert.ok(packed.exports?.["./cdk-overlay"]);
    }
  }
  const cdkDir = path.join(consumer, "node_modules", "@angular", "cdk");
  const cdkLock = lock.packages["node_modules/@angular/cdk"];
  assert.equal(fs.existsSync(cdkDir), !!cdkVersion, "Optional CDK presence");
  assert.equal(!!cdkLock, !!cdkVersion, "Optional CDK lock entry");
  if (cdkVersion)
    assert.equal(read(path.join(cdkDir, "package.json")).version, cdkVersion);
  console.log(
    `PASS packed ${cdkVersion ? "CDK" : "base"} consumer: ${names.length} local tarballs and entry paths`,
  );
}

module.exports = { verifyPackedConsumer };
