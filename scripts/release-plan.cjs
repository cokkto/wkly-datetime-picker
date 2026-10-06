// Release inputs are recorded separately from versions, so applying the same
// plan twice cannot create another revision. No registry writes happen here.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { shared, picker } = require("./public-packages.cjs");
const root = path.resolve(__dirname, "..");
const stateFile = "release-state.json";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
const versionParts = (version) => {
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const parts = version.split(".").map(Number);
  assert.ok(parts.every(Number.isSafeInteger), "Unsafe version component");
  return parts;
};
const releaseTag = (id) => {
  assert.match(id, /^[a-f0-9]{64}$/);
  return `wkly-release-${id}`;
};

function snapshot(directory = root) {
  const supported = read(path.join(directory, "supported-angular.json"));
  const names = [
    ...Object.keys(shared),
    ...Object.values(supported).map((row) => row.package),
  ];
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: directory, encoding: "utf8" },
  )
    .split("\0")
    .filter((file) => file && fs.existsSync(path.join(directory, file)))
    .sort();
  const contents = (file) =>
    fs.readFileSync(path.join(directory, file), "utf8").replace(/\r\n/g, "\n");
  // These inputs enter every published artifact. Consumer tests and workflow
  // orchestration do not alter tarballs and do not require package revisions.
  const common = [
    "LICENSE",
    "README.md",
    "docs/API.md",
    "tsconfig.json",
    "scripts/build.cjs",
    "scripts/compatibility.cjs",
    "scripts/public-packages.cjs",
  ].map((file) => [file, contents(file)]);
  const packages = {};
  for (const internal of names) {
    const manifest = read(
      path.join(directory, "projects", internal, "package.json"),
    );
    assert.equal(manifest.name, internal);
    versionParts(manifest.version);
    const normalized = { ...manifest };
    delete normalized.version;
    delete normalized.scripts; // Build strips scripts from outgoing manifests.
    const projectFiles = files.filter(
      (file) =>
        file.startsWith(`projects/${internal}/`) &&
        file !== `projects/${internal}/package.json` &&
        (shared[internal] || file !== `projects/${internal}/README.md`),
    );
    const angular = internal.match(/^wkly-datetime-picker\.(\d+)$/)?.[1];
    if (angular)
      assert.equal(versionParts(manifest.version)[0], Number(angular));
    packages[internal] = {
      name: shared[internal] || picker,
      version: manifest.version,
      input: digest(
        stable({
          common,
          sharedToolchains: Object.values(supported).map(
            (row) => row.dependencies?.esbuild,
          ),
          manifest: normalized,
          files: projectFiles.map((file) => [file, contents(file)]),
          ...(angular
            ? {
                toolchain: {
                  ...supported[angular],
                  // Preserve the recorded hash shape while ignoring retired demo
                  // entry paths. They never changed published picker artifacts.
                  runtimeEntry: `projects/wkly-datetime-picker.runtime.${angular}/src/main.ts`,
                  runtimeHtml: `projects/wkly-datetime-picker.runtime.${angular}/src/index.html`,
                },
              }
            : {}),
        }),
      ),
      dependencies: Object.keys(manifest.dependencies || {}).filter((name) =>
        names.includes(name),
      ),
    };
  }
  return { angular: Object.keys(supported), packages };
}

function validateState(state, current) {
  assert.equal(state.schemaVersion, 1);
  assert.ok(
    Number.isSafeInteger(state.sharedRevision) && state.sharedRevision >= 0,
  );
  assert.deepEqual(
    Object.keys(state.packages).sort(),
    Object.keys(current.packages).sort(),
    "Register new Angular lines through an explicit baseline migration",
  );
  for (const [internal, pkg] of Object.entries(state.packages)) {
    assert.equal(pkg.name, current.packages[internal].name);
    assert.match(pkg.input, /^[a-f0-9]{64}$/);
    assert.equal(
      pkg.version,
      current.packages[internal].version,
      `Manual version change: ${internal}; use release:prepare`,
    );
    if (!shared[internal])
      assert.equal(
        versionParts(pkg.version)[1],
        state.sharedRevision,
        "Shared revisions differ",
      );
  }
  if (state.release) {
    releaseTag(state.release.id);
    assert.equal(state.release.sharedRevision, state.sharedRevision);
    assert.ok(state.release.publish.length && state.release.angular.length);
    assert.deepEqual(
      state.release.angular,
      current.angular.filter((major) =>
        state.release.publish.some(
          (pkg) => pkg.internal === `wkly-datetime-picker.${major}`,
        ),
      ),
    );
    for (const pkg of state.release.publish) {
      assert.equal(pkg.name, state.packages[pkg.internal]?.name);
      assert.equal(pkg.version, state.packages[pkg.internal]?.version);
    }
  }
}

function createPlan(state, current) {
  validateState(state, current);
  const changed = new Set(
    Object.keys(current.packages).filter(
      (name) => current.packages[name].input !== state.packages[name].input,
    ),
  );
  if (!changed.size) return null;
  const direct = new Set(changed);
  // Exact outgoing dependencies make a dependent shared manifest a new
  // artifact even when its own implementation did not change.
  let grew;
  do {
    grew = false;
    for (const internal of Object.keys(shared)) {
      if (
        !changed.has(internal) &&
        current.packages[internal].dependencies.some((name) =>
          changed.has(name),
        )
      ) {
        changed.add(internal);
        grew = true;
      }
    }
  } while (grew);
  const sharedChange = Object.keys(shared).some((name) => changed.has(name));
  const sharedRevision = state.sharedRevision + Number(sharedChange);
  const packages = JSON.parse(JSON.stringify(current.packages));
  const publish = [];
  for (const [internal, pkg] of Object.entries(packages)) {
    const angular = !shared[internal];
    if (!changed.has(internal) && !(angular && sharedChange)) continue;
    const [major, minor, patch] = versionParts(pkg.version);
    const version = angular
      ? `${major}.${sharedRevision}.${sharedChange ? 0 : patch + 1}`
      : `${major}.${minor}.${patch + 1}`;
    versionParts(version);
    publish.push({
      internal,
      name: pkg.name,
      previous: pkg.version,
      version,
      reason: direct.has(internal)
        ? "inputs changed"
        : angular
          ? "shared revision"
          : "shared dependency changed",
    });
    pkg.version = version;
  }
  const angular = current.angular.filter((major) =>
    publish.some((pkg) => pkg.internal === `wkly-datetime-picker.${major}`),
  );
  assert.ok(angular.length, "Release must include a picker line");
  const baseline = digest(stable(state));
  const id = digest(stable({ baseline, packages, sharedRevision, publish }));
  return {
    schemaVersion: 1,
    baseline,
    sharedRevision,
    packages,
    release: {
      id,
      previous: state.release?.id || null,
      sharedRevision,
      angular,
      publish,
    },
  };
}

function verifyReceipt(release, receipt) {
  assert.equal(
    receipt.verified,
    true,
    "Previous release has not completed registry verification",
  );
  assert.equal(receipt.releaseId, release.id, "Wrong previous release receipt");
  assert.match(receipt.sourceCommit, /^[a-f0-9]{40}$/);
  assert.deepEqual(
    receipt.publish,
    release.publish.map(({ name, version }) => ({ name, version })),
    "Incomplete previous release receipt",
  );
  for (const pkg of release.publish) {
    const verified = receipt.packages.find(
      (row) => row.name === pkg.name && row.version === pkg.version,
    );
    assert.ok(
      verified && /^sha512-/.test(verified.integrity),
      "Missing verified artifact",
    );
  }
}

function applyPlan(plan, directory = root, receipt) {
  const state = read(path.join(directory, stateFile));
  const current = snapshot(directory);
  const expected = createPlan(state, current);
  if (!expected) return false;
  assert.deepEqual(
    plan,
    expected,
    "Stale or modified release plan; plan again before applying",
  );
  if (state.release) verifyReceipt(state.release, receipt || {});
  // Validate the entire plan and prior receipt before writing any manifest.
  for (const pkg of plan.release.publish) {
    const file = path.join(directory, "projects", pkg.internal, "package.json");
    const manifest = read(file);
    manifest.version = pkg.version;
    write(file, manifest);
  }
  write(path.join(directory, stateFile), {
    ...state,
    schemaVersion: 1,
    sharedRevision: plan.sharedRevision,
    packages: plan.packages,
    release: plan.release,
  });
  return true;
}

function qualifiedSelection(directory = root) {
  const state = read(path.join(directory, stateFile));
  assert.equal(
    createPlan(state, snapshot(directory)),
    null,
    "Unprepared package changes; run release:prepare and qualify its version commit",
  );
  assert.ok(
    state.release,
    "No package changes have been prepared for publication",
  );
  return state.release;
}

function packageMatrix(directory = root) {
  if (!fs.existsSync(path.join(directory, stateFile))) return null;
  const state = read(path.join(directory, stateFile));
  const current = snapshot(directory);
  return !createPlan(state, current) && state.release
    ? state.release.angular
    : null;
}

function summary(release) {
  return (
    `Release ${release.id}\n\nShared revision: ${release.sharedRevision}\n\n| Package | Previous | Next | Reason |\n| --- | --- | --- | --- |\n` +
    release.publish
      .map(
        (pkg) =>
          `| ${pkg.name} (${pkg.internal}) | ${pkg.previous} | ${pkg.version} | ${pkg.reason} |`,
      )
      .join("\n") +
    "\n\nPublication waits for Compatibility result on the merged main commit. An interrupted release must be recovered before planning another release.\n"
  );
}

module.exports = {
  snapshot,
  createPlan,
  applyPlan,
  qualifiedSelection,
  packageMatrix,
  verifyReceipt,
  releaseTag,
  summary,
};
if (require.main === module) {
  const [command, output = ".test-build/release-plan.json", receiptFile] =
    process.argv.slice(2);
  fs.mkdirSync(path.join(root, ".test-build"), { recursive: true });
  if (command === "plan" || command === "prepare") {
    const state = read(path.join(root, stateFile));
    const plan = createPlan(state, snapshot());
    if (plan) {
      if (command === "prepare")
        applyPlan(
          plan,
          root,
          receiptFile ? read(path.resolve(receiptFile)) : undefined,
        );
      write(path.resolve(output), plan);
      fs.writeFileSync(
        path.join(root, ".test-build/release-summary.md"),
        summary(plan.release),
      );
      console.log(summary(plan.release));
    } else console.log("No new package inputs; versions remain unchanged.");
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `changed=${!!plan}\nprevious=${state.release ? releaseTag(state.release.id) : ""}\nbranch=${plan ? `release/plan-${plan.release.id}` : ""}\n`,
      );
  } else if (command === "check") {
    const release = qualifiedSelection();
    console.log(summary(release));
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `tag=${releaseTag(release.id)}\n`,
      );
  } else
    throw new Error(
      "Usage: release-plan.cjs plan [output] | prepare [output] [previous-receipt] | check",
    );
}
