const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { rows, affected } = require("./compatibility.cjs");
const { verifyPackedConsumer } = require("./verify-packed-consumer.cjs");
test("current packages validate and global changes select all", () => {
  assert.ok(rows().length);
  assert.deepEqual(
    rows().map((row) => row.angular),
    ["11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"],
  );
  assert.deepEqual(affected(["scripts/build.cjs"]), rows());
  assert.deepEqual(affected(["supported-angular.json"]), rows());
  assert.deepEqual(
    affected(["projects/wkly-datetime-picker.core/src/public-api.ts"]),
    rows(),
  );
  assert.deepEqual(affected([]), []);
});
test("future packages and transitive shared dependencies need no script changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-matrix-"));
  try {
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.mkdirSync(path.join(dir, "projects"));
    fs.copyFileSync(
      __filename.replace(".test.cjs", ".cjs"),
      path.join(dir, "scripts/compatibility.cjs"),
    );
    fs.copyFileSync(
      path.join(__dirname, "verify-packed-consumer.cjs"),
      path.join(dir, "scripts/verify-packed-consumer.cjs"),
    );
    const metadata = {};
    const base = require("../supported-angular.json")["11"];
    for (const major of ["11", "12", "23"]) {
      metadata[major] = {
        ...base,
        package: `wkly-datetime-picker.${major}`,
        dependencies: { ...base.dependencies, "@angular/core": `${major}.0.0` },
      };
    }
    fs.writeFileSync(
      path.join(dir, "supported-angular.json"),
      JSON.stringify(metadata),
    );
    const packages = [
      { name: "shared", version: "0.1.0" },
      { name: "adapter", version: "0.1.0", dependencies: { shared: "*" } },
      ...Object.keys(metadata).map((major) => ({
        name: metadata[major].package,
        version: `${major}.0.0`,
        dependencies: { adapter: "*" },
      })),
    ];
    for (const pkg of packages) {
      fs.mkdirSync(path.join(dir, "projects", pkg.name));
      fs.writeFileSync(
        path.join(dir, "projects", pkg.name, "package.json"),
        JSON.stringify(pkg),
      );
    }
    const fixture = require(path.join(dir, "scripts/compatibility.cjs"));
    assert.deepEqual(
      fixture
        .affected(["projects/wkly-datetime-picker.12/src/a.ts"])
        .map((row) => row.angular),
      ["12"],
    );
    assert.deepEqual(
      fixture
        .affected([
          "projects/wkly-datetime-picker.11/a.ts",
          "projects/wkly-datetime-picker.23/a.ts",
        ])
        .map((row) => row.angular),
      ["11", "23"],
    );
    assert.equal(fixture.affected(["projects/shared/src/a.ts"]).length, 3);
    delete metadata["23"];
    assert.throws(() => fixture.rows(metadata), /Register/);
    metadata["23"] = {
      ...base,
      package: "wkly-datetime-picker.23",
      node: "bad",
    };
    assert.throws(() => fixture.rows(metadata), /Node/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("packed consumer verifies local tarball identity and public entry paths", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-packed-"));
  const consumer = path.join(dir, "consumer");
  const dist = path.join(dir, "dist");
  const names = [
    "wkly-datetime-picker.core",
    "wkly-datetime-picker.adapters",
    "wkly-datetime-picker",
    "wkly-datetime-picker.11",
  ];
  const dependencies = {};
  const lock = { packages: { "": { dependencies } } };
  const write = (file, value) =>
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  try {
    for (const name of names) {
      const spec = `file:../dist/${name}/${name}-1.0.0.tgz`;
      const packedDir = path.join(dist, name);
      const installedDir = path.join(consumer, "node_modules", name);
      fs.mkdirSync(packedDir, { recursive: true });
      fs.mkdirSync(installedDir, { recursive: true });
      const manifest = {
        name,
        version: "1.0.0",
        main: "index.js",
        types: "index.d.ts",
        ...(name.endsWith(".11")
          ? {
              exports: {
                "./cdk-overlay": {
                  types: "./overlay.d.ts",
                  default: "./overlay.js",
                },
              },
            }
          : {}),
      };
      for (const packageDir of [packedDir, installedDir]) {
        write(path.join(packageDir, "package.json"), manifest);
        for (const file of [
          "index.js",
          "index.d.ts",
          "LICENSE",
          "README.md",
          "API.md",
          ...(name.endsWith(".11") ? ["overlay.js", "overlay.d.ts"] : []),
        ])
          fs.writeFileSync(path.join(packageDir, file), "fixture\n");
      }
      const tarball = Buffer.from(`${name} tarball`);
      fs.writeFileSync(path.join(packedDir, `${name}-1.0.0.tgz`), tarball);
      dependencies[name] = spec;
      lock.packages[`node_modules/${name}`] = {
        version: "1.0.0",
        resolved: spec,
        integrity:
          "sha512-" + createHash("sha512").update(tarball).digest("base64"),
      };
    }
    write(path.join(consumer, "package-lock.json"), lock);
    const options = { consumer, dist, names, dependencies };
    verifyPackedConsumer(options);
    lock.packages["node_modules/wkly-datetime-picker.core"].integrity =
      "sha512-wrong";
    write(path.join(consumer, "package-lock.json"), lock);
    assert.throws(() => verifyPackedConsumer(options), /integrity mismatch/);
    lock.packages["node_modules/wkly-datetime-picker.core"].integrity =
      "sha512-" +
      createHash("sha512")
        .update(Buffer.from("wkly-datetime-picker.core tarball"))
        .digest("base64");
    lock.packages["node_modules/other/node_modules/wkly-datetime-picker.core"] =
      { version: "1.0.0" };
    write(path.join(consumer, "package-lock.json"), lock);
    assert.throws(
      () => verifyPackedConsumer(options),
      /Unexpected WKLY install/,
    );
    delete lock.packages[
      "node_modules/other/node_modules/wkly-datetime-picker.core"
    ];
    write(path.join(consumer, "package-lock.json"), lock);
    fs.rmSync(path.join(consumer, "node_modules", names[0], "index.d.ts"));
    assert.throws(() => verifyPackedConsumer(options), /Missing or escaped/);
    fs.writeFileSync(
      path.join(consumer, "node_modules", names[0], "index.d.ts"),
      "fixture\n",
    );
    for (const packageDir of [
      path.join(dist, names[3]),
      path.join(consumer, "node_modules", names[3]),
    ]) {
      const secondary = path.join(packageDir, "cdk-overlay");
      fs.mkdirSync(secondary);
      write(path.join(secondary, "package.json"), {
        module: "../overlay.js",
      });
    }
    verifyPackedConsumer(options);
    const cdkDir = path.join(consumer, "node_modules", "@angular", "cdk");
    fs.mkdirSync(cdkDir, { recursive: true });
    write(path.join(cdkDir, "package.json"), { version: "11.2.13" });
    lock.packages["node_modules/@angular/cdk"] = { version: "11.2.13" };
    write(path.join(consumer, "package-lock.json"), lock);
    verifyPackedConsumer({ ...options, cdkVersion: "11.2.13" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
