const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { rows, affected } = require("./compatibility.cjs");
test("current packages validate and global changes select all", () => {
  assert.ok(rows().length);
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
