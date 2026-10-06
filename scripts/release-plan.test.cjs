const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { shared, preparePublicSources } = require("./public-packages.cjs");
const {
  snapshot,
  createPlan,
  applyPlan,
  qualifiedSelection,
  packageMatrix,
  verifyReceipt,
  releaseTag,
} = require("./release-plan.cjs");
const { sameCandidates } = require("./release-record.cjs");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-plan-"));
  execFileSync("git", ["init", "--quiet"], { cwd: directory });
  const write = (file, value) => {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  const supported = Object.fromEntries(
    ["11", "19", "22"].map((major) => [
      major,
      {
        package: `wkly-datetime-picker.${major}`,
        dependencies: { esbuild: "0.21.5" },
      },
    ]),
  );
  write("supported-angular.json", supported);
  for (const file of [
    "LICENSE",
    "README.md",
    "docs/API.md",
    "tsconfig.json",
    "scripts/build.cjs",
    "scripts/compatibility.cjs",
    "scripts/public-packages.cjs",
  ])
    write(file, "initial\n");
  write("tsconfig.json", { compilerOptions: { paths: {} } });
  const dependencyNames = Object.keys(shared);
  for (const internal of [
    ...dependencyNames,
    ...Object.values(supported).map((row) => row.package),
  ]) {
    const isShared = !!shared[internal];
    const index = dependencyNames.indexOf(internal);
    write(`projects/${internal}/package.json`, {
      name: internal,
      version: isShared
        ? "0.1.0"
        : internal.endsWith(".19")
          ? "19.2.21"
          : internal.endsWith(".11")
            ? "11.2.3"
            : "22.2.4",
      dependencies: Object.fromEntries(
        (isShared ? dependencyNames.slice(0, index) : dependencyNames).map(
          (name) => [name, "^0.1.0"],
        ),
      ),
    });
    write(`projects/${internal}/src/index.ts`, "export const value = 1;\n");
  }
  const initial = snapshot(directory);
  write("release-state.json", {
    schemaVersion: 1,
    sharedRevision: 2,
    packages: initial.packages,
    release: null,
  });
  const state = () => read(path.join(directory, "release-state.json"));
  return {
    directory,
    write,
    state,
    plan: () => createPlan(state(), snapshot(directory)),
    dispose: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

function receipt(release) {
  return {
    verified: true,
    sourceCommit: "a".repeat(40),
    releaseId: release.id,
    publish: release.publish.map(({ name, version }) => ({ name, version })),
    packages: release.publish.map(({ name, version }) => ({
      name,
      version,
      integrity: "sha512-verified",
    })),
  };
}

test("retiring showcase entry metadata preserves release fingerprints; dependency changes still release", () => {
  const f = fixture();
  try {
    const supported = read(path.join(f.directory, "supported-angular.json"));
    for (const [major, row] of Object.entries(supported)) {
      row.runtimeEntry = `projects/wkly-datetime-picker.runtime.${major}/src/main.ts`;
      row.runtimeHtml = `projects/wkly-datetime-picker.runtime.${major}/src/index.html`;
    }
    f.write("supported-angular.json", supported);
    assert.equal(f.plan(), null);
    for (const row of Object.values(supported)) {
      delete row.runtimeEntry;
      delete row.runtimeHtml;
    }
    f.write("supported-angular.json", supported);
    assert.equal(f.plan(), null);
    supported["19"].dependencies.typescript = "5.6.3";
    f.write("supported-angular.json", supported);
    assert.deepEqual(f.plan().release.angular, ["19"]);
  } finally {
    f.dispose();
  }
});

test("an Angular-only fix advances its A revision, qualifies one line, and applies idempotently", () => {
  const f = fixture();
  try {
    assert.equal(f.plan(), null);
    f.write(
      "projects/wkly-datetime-picker.19/src/index.ts",
      "export const value = 2;\n",
    );
    const plan = f.plan();
    assert.equal(plan.sharedRevision, 2);
    assert.deepEqual(plan.release.angular, ["19"]);
    assert.deepEqual(
      plan.release.publish.map((pkg) => pkg.version),
      ["19.2.22"],
    );
    assert.equal(plan.packages["wkly-datetime-picker.11"].version, "11.2.3");
    assert.equal(plan.packages["wkly-datetime-picker.core"].version, "0.1.0");
    assert.equal(applyPlan(plan, f.directory), true);
    assert.equal(f.plan(), null);
    assert.equal(applyPlan(plan, f.directory), false);
    assert.deepEqual(qualifiedSelection(f.directory), plan.release);
    assert.deepEqual(packageMatrix(f.directory), ["19"]);
  } finally {
    f.dispose();
  }
});

test("shared changes advance S for all majors, reset A, and bump dependent shared manifests", () => {
  const f = fixture();
  try {
    f.write(
      "projects/wkly-datetime-picker.core/src/index.ts",
      "export const value = 2;\n",
    );
    const plan = f.plan();
    assert.equal(plan.sharedRevision, 3);
    assert.deepEqual(plan.release.angular, ["11", "19", "22"]);
    assert.deepEqual(
      plan.release.publish.map((pkg) => pkg.version),
      ["0.1.1", "0.1.1", "0.1.1", "11.3.0", "19.3.0", "22.3.0"],
    );
    assert.equal(plan.release.publish[1].reason, "shared dependency changed");
    applyPlan(plan, f.directory);
    assert.equal(f.plan(), null);
  } finally {
    f.dispose();
  }
});

test("a presentation-only change keeps unrelated shared versions and package docs/toolchains count as inputs", () => {
  const f = fixture();
  try {
    f.write(
      "projects/wkly-datetime-picker/src/index.ts",
      "export const value = 2;\n",
    );
    assert.deepEqual(
      f.plan().release.publish.map((pkg) => pkg.internal),
      [
        "wkly-datetime-picker",
        "wkly-datetime-picker.11",
        "wkly-datetime-picker.19",
        "wkly-datetime-picker.22",
      ],
    );
    f.write("docs/API.md", "changed public documentation\n");
    assert.equal(f.plan().release.publish.length, 6);
  } finally {
    f.dispose();
  }
});

test("workflow/test/integration-readme changes do not bump versions; deletions and secondary manifests do", () => {
  const f = fixture();
  try {
    f.write(".github/workflows/publish.yml", "workflow\n");
    f.write("projects/wkly-datetime-picker.tests/test.ts", "test\n");
    f.write("projects/wkly-datetime-picker.19/README.md", "source guide\n");
    assert.equal(f.plan(), null);
    f.write("projects/wkly-datetime-picker.19/cdk-overlay/package.json", {
      sideEffects: true,
    });
    assert.deepEqual(f.plan().release.angular, ["19"]);
    fs.rmSync(
      path.join(
        f.directory,
        "projects/wkly-datetime-picker.19/cdk-overlay/package.json",
      ),
    );
    execFileSync("git", ["add", "projects"], { cwd: f.directory });
    fs.rmSync(
      path.join(f.directory, "projects/wkly-datetime-picker.19/src/index.ts"),
    );
    assert.deepEqual(f.plan().release.angular, ["19"]);
  } finally {
    f.dispose();
  }
});

test("published shared READMEs trigger revisions for their package and dependents", () => {
  const f = fixture();
  try {
    f.write("projects/wkly-datetime-picker/README.md", "presentation guide\n");
    assert.deepEqual(
      f.plan().release.publish.map((pkg) => pkg.internal),
      [
        "wkly-datetime-picker",
        "wkly-datetime-picker.11",
        "wkly-datetime-picker.19",
        "wkly-datetime-picker.22",
      ],
    );
    f.write("projects/wkly-datetime-picker.core/README.md", "core guide\n");
    assert.equal(f.plan().release.publish.length, 6);
  } finally {
    f.dispose();
  }
});

test("stale plans and manual version changes fail before any manifest is written", () => {
  const f = fixture();
  try {
    f.write("projects/wkly-datetime-picker.19/src/index.ts", "changed\n");
    const plan = f.plan();
    f.write("projects/wkly-datetime-picker.22/src/index.ts", "also changed\n");
    assert.throws(() => applyPlan(plan, f.directory), /Stale or modified/);
    assert.equal(
      read(
        path.join(f.directory, "projects/wkly-datetime-picker.19/package.json"),
      ).version,
      "19.2.21",
    );
    const file = "projects/wkly-datetime-picker.19/package.json";
    const manifest = read(path.join(f.directory, file));
    f.write(file, { ...manifest, version: "19.9.9" });
    assert.throws(() => f.plan(), /Manual version change/);
  } finally {
    f.dispose();
  }
});

test("partial releases block the next version plan; a matching completed receipt permits it", () => {
  const f = fixture();
  try {
    f.write("projects/wkly-datetime-picker.19/src/index.ts", "changed\n");
    const first = f.plan();
    applyPlan(first, f.directory);
    f.write("projects/wkly-datetime-picker.19/src/index.ts", "next change\n");
    const next = f.plan();
    assert.throws(
      () => applyPlan(next, f.directory),
      /Previous release has not completed/,
    );
    const bad = receipt(first.release);
    bad.publish = [];
    assert.throws(
      () => applyPlan(next, f.directory, bad),
      /Incomplete previous/,
    );
    assert.equal(f.state().release.id, first.release.id);
    applyPlan(next, f.directory, receipt(first.release));
    assert.equal(
      f.state().packages["wkly-datetime-picker.19"].version,
      "19.2.23",
    );
    assert.equal(f.state().release.previous, first.release.id);
    assert.notEqual(f.state().release.id, first.release.id);
  } finally {
    f.dispose();
  }
});

test("release receipts and immutable candidate records reject missing artifacts, wrong IDs and changed bytes", () => {
  const f = fixture();
  try {
    f.write("projects/wkly-datetime-picker.19/src/index.ts", "changed\n");
    const release = f.plan().release;
    const valid = receipt(release);
    verifyReceipt(release, valid);
    assert.throws(
      () => verifyReceipt(release, { ...valid, packages: [] }),
      /Missing verified artifact/,
    );
    assert.throws(
      () => verifyReceipt(release, { ...valid, releaseId: "b".repeat(64) }),
      /Wrong previous/,
    );
    assert.match(releaseTag(release.id), /^wkly-release-[a-f0-9]{64}$/);
    const manifest = {
      releaseId: release.id,
      angular: release.angular,
      publish: valid.publish,
      packages: valid.packages,
      sourceCommit: "a".repeat(40),
    };
    sameCandidates(manifest, { ...manifest, sourceCommit: "b".repeat(40) });
    assert.throws(
      () =>
        sameCandidates(manifest, {
          ...manifest,
          packages: [{ ...valid.packages[0], integrity: "sha512-other" }],
        }),
      /Immutable release artifact conflict/,
    );
  } finally {
    f.dispose();
  }
});

test("planned revisions reach public manifests and exact dependencies, with stable line-ending fingerprints", () => {
  const f = fixture();
  try {
    f.write(
      "projects/wkly-datetime-picker.19/src/index.ts",
      "export const value = 1;\r\n",
    );
    assert.equal(
      f.plan(),
      null,
      "A Windows checkout must match the Linux release baseline",
    );
    f.write(
      "projects/wkly-datetime-picker.core/src/index.ts",
      "export const value = 2;\n",
    );
    const plan = f.plan();
    applyPlan(plan, f.directory);
    preparePublicSources(f.directory, "19");
    const publicManifest = read(
      path.join(f.directory, "projects/wkly-datetime-picker.19/package.json"),
    );
    assert.equal(publicManifest.name, "@wkly/datetime-picker");
    assert.equal(
      publicManifest.homepage,
      "https://github.com/cokkto/wkly-datetime-picker#readme",
    );
    assert.equal(publicManifest.version, "19.3.0");
    assert.deepEqual(publicManifest.dependencies, {
      "@wkly/core": "0.1.1",
      "@wkly/adapters": "0.1.1",
      "@wkly/presentation": "0.1.1",
    });
    assert.equal(
      read(
        path.join(
          f.directory,
          "projects/wkly-datetime-picker.adapters/package.json",
        ),
      ).dependencies["@wkly/core"],
      "0.1.1",
    );
  } finally {
    f.dispose();
  }
});
