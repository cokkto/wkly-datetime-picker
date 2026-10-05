const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { shared, picker, packageDirs } = require("./public-packages.cjs");
const supported = require("../supported-angular.json");
const root = path.resolve(__dirname, "..");
const registry = "https://registry.npmjs.org/";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const integrity = (file) =>
  "sha512-" +
  createHash("sha512").update(fs.readFileSync(file)).digest("base64");

function evidence(major, workspace, consumer) {
  const dependencies = read(path.join(consumer, "package.json")).dependencies;
  const packages = Object.entries(packageDirs(major)).map(
    ([name, internal]) => {
      const manifest = read(
        path.join(workspace, "dist", internal, "package.json"),
      );
      const tarball = path.resolve(consumer, dependencies[name].slice(5));
      assert.equal(
        path.dirname(tarball),
        path.join(workspace, "dist", internal),
      );
      assert.equal(manifest.name, name);
      return {
        name,
        version: manifest.version,
        internal,
        filename: path.basename(tarball),
        integrity: integrity(tarball),
        manifest,
      };
    },
  );
  write(path.join(workspace, "release-evidence.json"), {
    angular: major,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    packages,
  });
}

function findEvidence(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".git"].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? findEvidence(file)
      : entry.name === "release-evidence.json"
        ? [file]
        : [];
  });
}

function validateGraph(packages) {
  const versions = new Map(
    packages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]),
  );
  for (const pkg of packages) {
    assert.equal(
      path.basename(pkg.filename),
      pkg.filename,
      "Escaped tarball filename",
    );
    assert.match(pkg.filename, /^[a-zA-Z0-9_.-]+\.tgz$/);
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
    assert.equal(pkg.manifest.name, pkg.name);
    assert.equal(pkg.manifest.version, pkg.version);
    assert.equal(pkg.manifest.license, "MIT");
    assert.equal(pkg.manifest.publishConfig.access, "public");
    assert.equal(pkg.manifest.publishConfig.registry, registry);
    assert.equal(
      pkg.manifest.repository.url,
      "git+https://github.com/cokkto/wkly-datetime-picker.git",
    );
    for (const [name, version] of Object.entries(
      pkg.manifest.dependencies || {},
    )) {
      assert.ok(
        !name.startsWith("wkly-datetime-picker"),
        `Internal dependency: ${name}`,
      );
      assert.ok(
        !/^(file:|link:|workspace:)/.test(version),
        `Local dependency: ${name}`,
      );
      if (name.startsWith("@wkly/"))
        assert.ok(
          versions.has(`${name}@${version}`),
          `Missing release dependency: ${name}@${version}`,
        );
    }
    if (pkg.name === picker) {
      const major = pkg.version.split(".")[0];
      for (const name of [
        "@angular/core",
        "@angular/common",
        "@angular/forms",
        "@angular/cdk",
      ])
        assert.equal(
          pkg.manifest.peerDependencies[name],
          `>=${major} <${Number(major) + 1}`,
        );
      assert.equal(
        pkg.manifest.peerDependenciesMeta["@angular/cdk"].optional,
        true,
      );
    } else {
      assert.ok(Object.values(shared).includes(pkg.name));
      for (const name of Object.keys({
        ...pkg.manifest.dependencies,
        ...pkg.manifest.peerDependencies,
      }))
        assert.ok(
          !name.startsWith("@angular/") && name !== "rxjs",
          `Framework dependency: ${pkg.name}`,
        );
    }
  }
}

function collect(input, destination, commit) {
  const files = findEvidence(input);
  const majors = Object.keys(supported);
  assert.equal(
    files.length,
    majors.length,
    "Require one qualified artifact set per Angular major",
  );
  fs.mkdirSync(destination, { recursive: true });
  const found = new Set();
  const packages = new Map();
  for (const file of files) {
    const row = read(file);
    assert.ok(
      majors.includes(row.angular) && !found.has(row.angular),
      `Unexpected/duplicate Angular ${row.angular}`,
    );
    found.add(row.angular);
    assert.equal(row.sourceCommit, commit, "Mixed source commits");
    assert.deepEqual(
      row.packages.map((pkg) => pkg.name).sort(),
      Object.keys(packageDirs(row.angular)).sort(),
    );
    assert.equal(
      row.packages.find((pkg) => pkg.name === picker).version.split(".")[0],
      row.angular,
    );
    for (const pkg of row.packages) {
      const tarball = path.join(
        path.dirname(file),
        "dist",
        pkg.internal,
        pkg.filename,
      );
      assert.equal(
        path.basename(pkg.filename),
        pkg.filename,
        "Escaped tarball filename",
      );
      assert.equal(
        pkg.internal,
        packageDirs(row.angular)[pkg.name],
        "Unexpected artifact directory",
      );
      assert.equal(
        integrity(tarball),
        pkg.integrity,
        "Changed qualified tarball",
      );
      const key = `${pkg.name}@${pkg.version}`;
      if (packages.has(key)) {
        // A shared version is one immutable artifact across the entire matrix.
        assert.equal(
          packages.get(key).integrity,
          pkg.integrity,
          `Different shared artifacts for ${key}`,
        );
        continue;
      }
      fs.copyFileSync(tarball, path.join(destination, pkg.filename));
      packages.set(key, {
        ...pkg,
        tag: pkg.name === picker ? `angular-${row.angular}` : "latest",
      });
    }
  }
  const ordered = [...packages.values()].sort((a, b) => {
    const rank = (pkg) =>
      pkg.name === picker ? 3 : Object.values(shared).indexOf(pkg.name);
    return (
      rank(a) - rank(b) ||
      Number(a.version.split(".")[0]) - Number(b.version.split(".")[0])
    );
  });
  validateGraph(ordered);
  for (const name of Object.values(shared))
    assert.equal(
      ordered.filter((pkg) => pkg.name === name).length,
      1,
      `Shared version mismatch: ${name}`,
    );
  assert.equal(
    new Set(
      ordered
        .filter((pkg) => pkg.name === picker)
        .map((pkg) => pkg.version.split(".")[1]),
    ).size,
    1,
    "Shared revisions differ between Angular lines",
  );
  const plan = {
    sourceCommit: commit,
    angular: majors,
    registry,
    packages: ordered,
  };
  write(path.join(destination, "manifest.json"), plan);
  console.table(
    ordered.map(({ name, version, tag }) => ({ name, version, tag })),
  );
  return plan;
}

function metadata(name) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      registry + encodeURIComponent(name),
      { headers: { accept: "application/json" } },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("error", reject);
        response.on("end", () => {
          if (response.statusCode === 404) return resolve(null);
          if (response.statusCode !== 200)
            return reject(
              new Error(`Registry returned ${response.statusCode} for ${name}`),
            );
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(30000, () =>
      request.destroy(new Error(`Registry timeout: ${name}`)),
    );
    request.on("error", reject);
  });
}

function checkExisting(pkg, document) {
  const existing = document?.versions?.[pkg.version];
  if (!existing) return false;
  assert.equal(
    existing.dist.integrity,
    pkg.integrity,
    `Published version differs: ${pkg.name}@${pkg.version}; choose a new version, never overwrite it`,
  );
  return true;
}

function npm(args, cwd = root) {
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function publish(destination) {
  const plan = read(path.join(destination, "manifest.json"));
  validateGraph(plan.packages);
  assert.equal(plan.registry, registry);
  // The workflow checks the successful compatibility run before reaching here.
  assert.equal(
    process.env.WKLY_QUALIFIED_COMMIT,
    plan.sourceCommit,
    "Require the qualified source commit",
  );
  const latest = plan.packages.filter((pkg) => pkg.name === picker).at(-1);
  assert.ok(latest);
  // Check every version before the first mutation; only a real 404 means absent.
  for (const pkg of plan.packages) {
    assert.equal(
      integrity(path.join(destination, pkg.filename)),
      pkg.integrity,
    );
    checkExisting(pkg, await metadata(pkg.name));
  }
  for (const pkg of plan.packages) {
    if (!checkExisting(pkg, await metadata(pkg.name)))
      npm([
        "publish",
        path.join(destination, pkg.filename),
        "--ignore-scripts",
        "--access",
        "public",
        "--registry",
        registry,
        "--tag",
        pkg.tag,
      ]);
    const document = await metadata(pkg.name);
    assert.ok(
      checkExisting(pkg, document),
      `Published package is missing: ${pkg.name}`,
    );
    if (document["dist-tags"]?.[pkg.tag] !== pkg.version)
      npm([
        "dist-tag",
        "add",
        `${pkg.name}@${pkg.version}`,
        pkg.tag,
        "--registry",
        registry,
      ]);
    console.log(`Verified ${pkg.name}@${pkg.version}`);
  }
  npm([
    "dist-tag",
    "add",
    `${picker}@${latest.version}`,
    "latest",
    "--registry",
    registry,
  ]);
  await verifyRegistry(plan);
  write(path.join(destination, "published.json"), {
    sourceCommit: plan.sourceCommit,
    verified: true,
    packages: plan.packages.map(({ name, version, integrity }) => ({
      name,
      version,
      integrity,
    })),
  });
}

async function verifyRegistry(plan) {
  for (const major of plan.angular) {
    const pickerPackage = plan.packages.find(
      (pkg) => pkg.name === picker && pkg.version.split(".")[0] === major,
    );
    const expected = [
      ...plan.packages.filter((pkg) => pkg.name !== picker),
      pickerPackage,
    ];
    const dependencies = Object.fromEntries(
      expected.map((pkg) => [pkg.name, pkg.version]),
    );
    for (const name of [
      "@angular/core",
      "@angular/common",
      "@angular/forms",
      "rxjs",
    ])
      dependencies[name] = supported[major].dependencies[name];
    fs.mkdirSync(path.join(root, ".test-build"), { recursive: true });
    const consumer = fs.mkdtempSync(
      path.join(root, `.test-build/registry-${major}-`),
    );
    write(path.join(consumer, "package.json"), {
      name: "wkly-registry-consumer",
      private: true,
      dependencies,
    });
    const verify = (cdk) => {
      const lock = read(path.join(consumer, "package-lock.json"));
      for (const pkg of expected) {
        const entry = lock.packages[`node_modules/${pkg.name}`];
        assert.equal(entry.version, pkg.version);
        assert.equal(entry.integrity, pkg.integrity);
        assert.ok(
          entry.resolved.startsWith(registry),
          `Non-registry install: ${pkg.name}`,
        );
        const manifest = read(
          path.join(consumer, "node_modules", pkg.name, "package.json"),
        );
        assert.deepEqual(manifest.dependencies, pkg.manifest.dependencies);
      }
      assert.equal(!!lock.packages["node_modules/@angular/cdk"], cdk);
    };
    npm(
      [
        "install",
        "--ignore-scripts",
        "--strict-peer-deps",
        "--no-audit",
        "--no-fund",
        "--registry",
        registry,
      ],
      consumer,
    );
    verify(false);
    dependencies["@angular/cdk"] =
      supported[major].dependencies["@angular/cdk"];
    write(path.join(consumer, "package.json"), {
      name: "wkly-registry-consumer",
      private: true,
      dependencies,
    });
    npm(
      [
        "install",
        "--ignore-scripts",
        "--strict-peer-deps",
        "--no-audit",
        "--no-fund",
        "--registry",
        registry,
      ],
      consumer,
    );
    verify(true);
    console.log(
      `PASS registry Angular ${major}: base/CDK installs match qualified tarballs`,
    );
  }
}

module.exports = { evidence, collect, validateGraph, checkExisting, integrity };
if (require.main === module) {
  const [command, input, destination, commit] = process.argv.slice(2);
  (async () => {
    if (
      command === "collect" &&
      input &&
      destination &&
      /^[a-f0-9]{40}$/.test(commit || "")
    )
      collect(path.resolve(input), path.resolve(destination), commit);
    else if (command === "publish" && input) await publish(path.resolve(input));
    else
      throw new Error(
        "Usage: release.cjs collect <artifacts> <output> <source-commit> | publish <output>",
      );
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
