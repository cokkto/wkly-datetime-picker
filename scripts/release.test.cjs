const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { gzipSync, gunzipSync } = require("node:zlib");
const { collect, checkExisting, integrity } = require("./release.cjs");
const {
  shared,
  picker,
  packageDirs,
  rewriteImports,
  tarballFilename,
  normalizeTarball,
} = require("./public-packages.cjs");
const supported = require("../supported-angular.json");

test("tarball normalization preserves the npm tar payload and removes compression variants", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-gzip-"));
  try {
    const payload = Buffer.from("qualified npm tar payload".repeat(1000));
    const first = path.join(directory, "first.tgz");
    const second = path.join(directory, "second.tgz");
    fs.writeFileSync(first, gzipSync(payload, { level: 1 }));
    fs.writeFileSync(second, gzipSync(payload, { level: 9 }));
    normalizeTarball(first);
    normalizeTarball(second);
    assert.deepEqual(fs.readFileSync(first), fs.readFileSync(second));
    assert.deepEqual(gunzipSync(fs.readFileSync(first)), payload);
    assert.equal(fs.readFileSync(first)[9], 255);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("tarball paths normalize scoped names independently of old npm JSON filenames", () => {
  assert.equal(
    tarballFilename({
      name: "@wkly/core",
      version: "0.1.0",
      filename: "@wkly/core-0.1.0.tgz",
    }),
    "wkly-core-0.1.0.tgz",
  );
  assert.equal(
    tarballFilename({ name: picker, version: "11.0.0" }),
    "wkly-datetime-picker-11.0.0.tgz",
  );
  const fixture = fs.readFileSync(
    path.join(
      __dirname,
      "../projects/wkly-datetime-picker.tests/packages/angular/main.ts",
    ),
    "utf8",
  );
  assert.ok(
    !/from\s*["']wkly-datetime-picker/.test(fixture),
    "Public consumer fixture must not resolve internal workspace packages",
  );
});

test("public imports preserve selectors and similar package names", () => {
  const source = `import {A} from 'wkly-datetime-picker';\nexport * from "wkly-datetime-picker.11/cdk-overlay";\nconst selector = 'wkly-datetime-picker';\nimport 'wkly-datetime-picker-other';\nconst c = import('wkly-datetime-picker.core');`;
  const result = rewriteImports(source, {
    ...shared,
    "wkly-datetime-picker.11": picker,
  });
  assert.ok(result.includes("from '@wkly/presentation'"));
  assert.ok(result.includes('from "@wkly/datetime-picker/cdk-overlay"'));
  assert.ok(result.includes("selector = 'wkly-datetime-picker'"));
  assert.ok(result.includes("import 'wkly-datetime-picker-other'"));
  assert.ok(result.includes("import('@wkly/core')"));
});

test("publication skips identical existing versions and rejects conflicting versions", () => {
  const pkg = { name: picker, version: "11.0.0", integrity: "sha512-reviewed" };
  assert.equal(checkExisting(pkg, null), false);
  assert.equal(checkExisting(pkg, { versions: {} }), false);
  assert.equal(
    checkExisting(pkg, {
      versions: { "11.0.0": { dist: { integrity: pkg.integrity } } },
    }),
    true,
  );
  assert.throws(
    () =>
      checkExisting(pkg, {
        versions: { "11.0.0": { dist: { integrity: "sha512-other" } } },
      }),
    /Published version differs/,
  );
});

test("collect requires a full single-commit matrix with identical shared artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-release-"));
  const input = path.join(directory, "input");
  const commit = "a".repeat(40);
  const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
  const evidenceFiles = [];
  try {
    for (const major of Object.keys(supported)) {
      const workspace = path.join(input, major);
      fs.mkdirSync(workspace, { recursive: true });
      const packages = Object.entries(packageDirs(major)).map(
        ([name, internal]) => {
          const version = name === picker ? `${major}.0.0` : "0.1.0";
          const filename =
            name.slice(1).replace("/", "-") + "-" + version + ".tgz";
          const tarball = path.join(workspace, "dist", internal, filename);
          fs.mkdirSync(path.dirname(tarball), { recursive: true });
          fs.writeFileSync(tarball, `${name}@${version}`);
          const manifest = {
            name,
            version,
            license: "MIT",
            publishConfig: {
              access: "public",
              registry: "https://registry.npmjs.org/",
            },
            repository: {
              url: "git+https://github.com/cokkto/wkly-datetime-picker.git",
            },
          };
          if (name === picker) {
            manifest.dependencies = Object.fromEntries(
              Object.values(shared).map((name) => [name, "0.1.0"]),
            );
            manifest.peerDependencies = Object.fromEntries(
              [
                "@angular/core",
                "@angular/common",
                "@angular/forms",
                "@angular/cdk",
              ].map((name) => [name, `>=${major} <${Number(major) + 1}`]),
            );
            manifest.peerDependenciesMeta = {
              "@angular/cdk": { optional: true },
            };
          }
          return {
            name,
            version,
            filename,
            internal,
            integrity: integrity(tarball),
            manifest,
          };
        },
      );
      const file = path.join(workspace, "release-evidence.json");
      write(file, { angular: major, sourceCommit: commit, packages });
      evidenceFiles.push(file);
    }
    const output = path.join(directory, "output");
    const plan = collect(input, output, commit);
    assert.equal(plan.packages.length, Object.keys(supported).length + 3);
    assert.deepEqual(
      plan.packages.slice(0, 3).map((pkg) => pkg.name),
      Object.values(shared),
    );
    assert.equal(
      plan.packages.at(-1).tag,
      `angular-${Object.keys(supported).at(-1)}`,
    );
    const file = evidenceFiles.at(-1);
    const row = JSON.parse(fs.readFileSync(file, "utf8"));
    row.sourceCommit = "b".repeat(40);
    write(file, row);
    assert.throws(() => collect(input, output, commit), /Mixed source commits/);
    row.sourceCommit = commit;
    const pkg = row.packages[0];
    const tarball = path.join(
      path.dirname(file),
      "dist",
      pkg.internal,
      pkg.filename,
    );
    fs.writeFileSync(tarball, "changed shared package");
    write(file, row);
    assert.throws(
      () => collect(input, output, commit),
      /Changed qualified tarball/,
    );
    pkg.integrity = integrity(tarball);
    write(file, row);
    assert.throws(
      () => collect(input, output, commit),
      /Different shared artifacts/,
    );
    fs.unlinkSync(file);
    assert.throws(
      () => collect(input, output, commit),
      /one qualified artifact set/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
