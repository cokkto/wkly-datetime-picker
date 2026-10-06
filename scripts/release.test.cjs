const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { gzipSync, gunzipSync } = require("node:zlib");
const {
  collect,
  checkExisting,
  waitForPublished,
  publish,
  verifyTrustedPublisher,
  integrity,
} = require("./release.cjs");
const {
  shared,
  picker,
  packageDirs,
  rewriteImports,
  tarballFilename,
  normalizeTarball,
} = require("./public-packages.cjs");
const supported = require("../supported-angular.json");
const { record } = require("./release-record.cjs");
const { createHash } = require("node:crypto");

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

function trustedPublisherMock({
  exchangeStatus = 201,
  writeStatus = 201,
} = {}) {
  const calls = [];
  const result = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  return {
    calls,
    options: {
      identityUrl: "https://github.example.test/token?api-version=2",
      identityToken: "fake-github-request-token",
      request: async (url, options) => {
        calls.push({ url: String(url), options });
        const target = new URL(url);
        if (target.host === "github.example.test") {
          assert.equal(
            target.searchParams.get("audience"),
            "npm:registry.npmjs.org",
          );
          assert.equal(
            options.headers.authorization,
            "Bearer fake-github-request-token",
          );
          return result(200, { value: "fake-identity-token" });
        }
        if (options.method === "POST") {
          assert.ok(target.pathname.includes("/oidc/token/exchange/package/"));
          assert.equal(
            options.headers.authorization,
            "Bearer fake-identity-token",
          );
          return result(exchangeStatus, { token: "fake-npm-token" });
        }
        if (options.method === "PUT") {
          assert.ok(target.pathname.endsWith("/dist-tags/latest"));
          assert.equal(options.headers.authorization, "Bearer fake-npm-token");
          assert.equal(options.body, JSON.stringify("0.1.0"));
          return result(writeStatus, {});
        }
        return result(200, {
          "dist-tags": { latest: "0.1.0" },
          versions: { "0.1.0": {} },
        });
      },
    },
  };
}

test("trusted publishing verifies an authenticated write even when latest is already correct", async () => {
  const mock = trustedPublisherMock();
  assert.deepEqual(await verifyTrustedPublisher("@wkly/core", mock.options), {
    name: "@wkly/core",
    tag: "latest",
    version: "0.1.0",
  });
  assert.equal(
    mock.calls.filter((call) => call.options.method === "PUT").length,
    1,
  );
  assert.equal(mock.calls.length, 5);
});

test("public tags cannot hide a rejected trusted publisher exchange", async () => {
  const mock = trustedPublisherMock({ exchangeStatus: 401 });
  await assert.rejects(
    verifyTrustedPublisher("@wkly/core", mock.options),
    /OIDC exchange failed.*401/,
  );
  assert.equal(
    mock.calls.filter((call) => call.options.method === "PUT").length,
    0,
  );
});

test("trusted publishing fails when the exchanged token cannot manage tags", async () => {
  const mock = trustedPublisherMock({ writeStatus: 403 });
  await assert.rejects(
    verifyTrustedPublisher("@wkly/core", mock.options),
    /Tag authorization failed.*403/,
  );
});

test("publication waits for matching version metadata after npm accepts a tarball", async () => {
  const pkg = { name: picker, version: "11.0.0", integrity: "sha512-reviewed" };
  const published = {
    versions: { "11.0.0": { dist: { integrity: pkg.integrity } } },
  };
  const responses = [null, { versions: {} }, published];
  let pauses = 0;
  const actual = await waitForPublished(
    pkg,
    async (name) => {
      assert.equal(name, pkg.name);
      return responses.shift();
    },
    async (milliseconds) => {
      assert.equal(milliseconds, 10000);
      pauses++;
    },
  );
  assert.equal(actual, published);
  assert.equal(pauses, 2);
});

test("publication visibility waits remain bounded and reject conflicts and registry errors", async () => {
  const pkg = { name: picker, version: "11.0.0", integrity: "sha512-reviewed" };
  let reads = 0;
  let pauses = 0;
  await assert.rejects(
    waitForPublished(
      pkg,
      async () => {
        reads++;
        return null;
      },
      async () => {
        pauses++;
      },
    ),
    /not visible after ten minutes/,
  );
  assert.equal(reads, 61);
  assert.equal(pauses, 60);
  const noPause = async () => assert.fail("Errors must not be retried");
  await assert.rejects(
    waitForPublished(
      pkg,
      async () => ({
        versions: { "11.0.0": { dist: { integrity: "sha512-other" } } },
      }),
      noPause,
    ),
    /Published version differs/,
  );
  await assert.rejects(
    waitForPublished(
      pkg,
      async () => {
        throw new Error("Registry returned 403");
      },
      noPause,
    ),
    /Registry returned 403/,
  );
});

function qualifiedFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-release-"));
  const input = path.join(directory, "input");
  const commit = "a".repeat(40);
  const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
  const evidenceFiles = [];
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
  return { directory, input, commit, evidenceFiles, write };
}

test("publication preflights all artifacts and submits the graph before waiting for metadata", async () => {
  const { directory, input, commit } = qualifiedFixture();
  const previousCommit = process.env.WKLY_QUALIFIED_COMMIT;
  try {
    const output = path.join(directory, "output");
    const plan = collect(input, output, commit);
    process.env.WKLY_QUALIFIED_COMMIT = commit;
    const existing = plan.packages[0];
    const toSubmit = plan.packages.slice(1);
    let reads = 0;
    let submitted = 0;
    let verifiedConsumers = false;
    await publish(output, {
      readMetadata: async (name) => {
        reads++;
        const visible = plan.packages.filter(
          (pkg) =>
            pkg.name === name &&
            (pkg === existing || submitted === toSubmit.length),
        );
        return {
          versions: Object.fromEntries(
            visible.map((pkg) => [
              pkg.version,
              { dist: { integrity: pkg.integrity } },
            ]),
          ),
          "dist-tags": Object.fromEntries(
            visible.map((pkg) => [pkg.tag, pkg.version]),
          ),
        };
      },
      runNpm: (args) => {
        assert.ok(
          reads >= plan.packages.length,
          "All versions must be preflighted before mutations",
        );
        if (args[0] === "publish") {
          assert.equal(
            args[1],
            path.join(output, toSubmit[submitted].filename),
          );
          submitted++;
        } else {
          assert.equal(submitted, toSubmit.length);
          assert.equal(args[0], "dist-tag");
        }
      },
      pause: async () =>
        assert.fail("Every artifact must be submitted before waiting"),
      verifyConsumers: async (actual) => {
        assert.deepEqual(actual, plan);
        assert.equal(submitted, toSubmit.length);
        verifiedConsumers = true;
      },
    });
    assert.equal(submitted, toSubmit.length);
    assert.ok(verifiedConsumers);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(output, "published.json"))).verified,
      true,
    );

    let mutations = 0;
    const conflicting = plan.packages.at(-1);
    await assert.rejects(
      publish(output, {
        readMetadata: async (name) => ({
          versions:
            name === conflicting.name
              ? {
                  [conflicting.version]: {
                    dist: { integrity: "sha512-conflict" },
                  },
                }
              : {},
        }),
        runNpm: () => mutations++,
      }),
      /Published version differs/,
    );
    assert.equal(mutations, 0);
    fs.writeFileSync(
      path.join(output, conflicting.filename),
      "tampered after qualification",
    );
    await assert.rejects(
      publish(output, {
        readMetadata: async () => null,
        runNpm: () => mutations++,
      }),
    );
    assert.equal(mutations, 0);
  } finally {
    if (previousCommit === undefined) delete process.env.WKLY_QUALIFIED_COMMIT;
    else process.env.WKLY_QUALIFIED_COMMIT = previousCommit;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("collect requires a full single-commit matrix with identical shared artifacts", () => {
  const { directory, input, commit, evidenceFiles, write } = qualifiedFixture();
  try {
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

test("an Angular-only release publishes one candidate, preserves latest, and resumes without another version", async () => {
  const { directory, input, commit, evidenceFiles } = qualifiedFixture();
  const previousCommit = process.env.WKLY_QUALIFIED_COMMIT;
  try {
    for (const file of evidenceFiles)
      if (JSON.parse(fs.readFileSync(file)).angular !== "19")
        fs.unlinkSync(file);
    const selection = {
      id: "c".repeat(64),
      angular: ["19"],
      publish: [{ name: picker, version: "19.0.0" }],
    };
    const output = path.join(directory, "output");
    const plan = collect(input, output, commit, selection);
    assert.equal(plan.packages.length, 4);
    const candidate = plan.packages.at(-1);
    let submitted = false;
    const mutations = [];
    const readMetadata = async (name) => ({
      versions: Object.fromEntries(
        plan.packages
          .filter(
            (pkg) => pkg.name === name && (pkg !== candidate || submitted),
          )
          .map((pkg) => [pkg.version, { dist: { integrity: pkg.integrity } }]),
      ),
      "dist-tags":
        name === picker
          ? {
              latest: "22.0.0",
              ...(submitted ? { "angular-19": "19.0.0" } : {}),
            }
          : { latest: "0.1.0" },
    });
    const runNpm = (args) => {
      mutations.push(args);
      assert.equal(args[0], "publish");
      assert.equal(args[1], path.join(output, candidate.filename));
      submitted = true;
    };
    process.env.WKLY_QUALIFIED_COMMIT = commit;
    await assert.rejects(
      publish(output, {
        readMetadata,
        runNpm,
        verifyConsumers: async () => {
          throw new Error("Consumer verification interrupted");
        },
      }),
      /Consumer verification interrupted/,
    );
    assert.equal(fs.existsSync(path.join(output, "published.json")), false);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(output, "progress.json"))).submitted
        .length,
      1,
    );
    await publish(output, {
      readMetadata,
      runNpm,
      verifyConsumers: async () => {},
    });
    assert.equal(mutations.length, 1);
    const receipt = JSON.parse(
      fs.readFileSync(path.join(output, "published.json")),
    );
    assert.equal(receipt.verified, true);
    assert.equal(receipt.releaseId, selection.id);
    assert.deepEqual(receipt.publish, selection.publish);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(output, "progress.json"))).status,
      "verified",
    );

    let writes = 0;
    await assert.rejects(
      publish(output, {
        readMetadata: async () => null,
        runNpm: () => writes++,
      }),
      /Unselected dependency is not published/,
    );
    assert.equal(writes, 0);
    await assert.rejects(
      publish(output, {
        readMetadata: async (name) => ({
          ...(await readMetadata(name)),
          "dist-tags":
            name === picker
              ? { "angular-19": "19.0.1", latest: "22.0.0" }
              : { latest: "0.1.0" },
        }),
        runNpm: () => writes++,
      }),
      /backwards/,
    );
    assert.equal(writes, 0);
  } finally {
    if (previousCommit === undefined) delete process.env.WKLY_QUALIFIED_COMMIT;
    else process.env.WKLY_QUALIFIED_COMMIT = previousCommit;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("draft retention recovers a partial upload, retains failure progress, and finalizes only verified receipts", () => {
  const { directory, input, commit, evidenceFiles, write } = qualifiedFixture();
  const previousEnv = Object.fromEntries(
    [
      "GH_REPO",
      "WKLY_QUALIFIED_COMMIT",
      "GITHUB_RUN_ID",
      "GITHUB_RUN_ATTEMPT",
    ].map((name) => [name, process.env[name]]),
  );
  try {
    Object.assign(process.env, {
      GH_REPO: "example/wkly",
      WKLY_QUALIFIED_COMMIT: commit,
      GITHUB_RUN_ID: "123",
      GITHUB_RUN_ATTEMPT: "1",
    });
    for (const file of evidenceFiles)
      if (JSON.parse(fs.readFileSync(file)).angular !== "19")
        fs.unlinkSync(file);
    const selection = {
      id: "d".repeat(64),
      sharedRevision: 0,
      angular: ["19"],
      publish: [
        {
          name: picker,
          internal: "wkly-datetime-picker.19",
          previous: "19.0.0",
          version: "19.0.0",
          reason: "test",
        },
      ],
    };
    const output = path.join(directory, "output");
    const plan = collect(input, output, commit, selection);
    const assets = new Map();
    let exists = false;
    let draft = true;
    let interrupt = true;
    let tags = 0;
    const options = {
      getSelection: () => selection,
      runGit: (args) => {
        if (args.includes("tag")) tags++;
        return "";
      },
      runGh: (args) => {
        if (args[0] === "api") {
          if (!exists)
            throw Object.assign(new Error("Not found"), {
              stderr: "Not Found (HTTP 404)",
            });
          return JSON.stringify({
            draft,
            assets: [...assets].map(([name, bytes]) => ({
              name,
              digest:
                "sha256:" + createHash("sha256").update(bytes).digest("hex"),
            })),
          });
        }
        if (args[1] === "create") {
          exists = true;
          return "";
        }
        if (args[1] === "upload") {
          for (const file of args.slice(3)) {
            const name = path.basename(file);
            assert.ok(
              !assets.has(name),
              "Existing assets must not be overwritten",
            );
            assets.set(name, fs.readFileSync(file));
            if (name.endsWith(".tgz") && interrupt) {
              interrupt = false;
              throw new Error("Upload interrupted");
            }
          }
          return "";
        }
        if (args[1] === "download") {
          const name = args[args.indexOf("--pattern") + 1];
          fs.writeFileSync(
            path.join(args[args.indexOf("--dir") + 1], name),
            assets.get(name),
          );
          return "";
        }
        assert.equal(args[1], "edit");
        draft = false;
        return "";
      },
    };
    assert.throws(() => record("begin", output, options), /Upload interrupted/);
    assert.equal(draft, true);
    assert.equal(assets.size, 2);
    record("begin", output, options);
    assert.equal(assets.size, 5);
    assert.equal(tags, 1);
    write(path.join(output, "progress.json"), {
      status: "submitted",
      submitted: selection.publish,
    });
    record("failure", output, options);
    assert.ok(assets.has("progress-123-1.json"));
    const receipt = {
      sourceCommit: commit,
      releaseId: selection.id,
      verified: false,
      publish: plan.publish,
      packages: plan.packages.map(({ name, version, integrity }) => ({
        name,
        version,
        integrity,
      })),
    };
    write(path.join(output, "published.json"), receipt);
    assert.throws(
      () => record("complete", output, options),
      /not completed registry verification/,
    );
    assert.equal(draft, true);
    assert.equal(assets.has("published.json"), false);
    write(path.join(output, "published.json"), { ...receipt, verified: true });
    write(path.join(output, "trusted-publishing.json"), {
      sourceCommit: commit,
      verified: true,
      packages: plan.packages.map(({ name }) => ({ name })),
    });
    record("complete", output, options);
    assert.equal(draft, false);
    const count = assets.size;
    record("complete", output, options);
    assert.equal(assets.size, count);
    assets.set(
      plan.packages[0].filename,
      Buffer.from("different retained bytes"),
    );
    assert.throws(
      () => record("begin", output, options),
      /Retained tarball conflict/,
    );
  } finally {
    for (const [name, value] of Object.entries(previousEnv))
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
