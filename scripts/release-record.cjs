// A draft release retains immutable candidates before the first npm mutation.
// Only a successful registry receipt turns that draft into a completed release.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  releaseTag,
  qualifiedSelection,
  verifyReceipt,
  summary,
} = require("./release-plan.cjs");
const { integrity, validateGraph } = require("./release.cjs");
const { createHash } = require("node:crypto");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const gh = (args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

function sameCandidates(original, candidate) {
  assert.equal(original.releaseId, candidate.releaseId, "Release ID conflict");
  assert.deepEqual(
    original.publish,
    candidate.publish,
    "Publication selection conflict",
  );
  assert.deepEqual(
    original.angular,
    candidate.angular,
    "Qualification selection conflict",
  );
  assert.deepEqual(
    original.packages.map(({ name, version, integrity }) => ({
      name,
      version,
      integrity,
    })),
    candidate.packages.map(({ name, version, integrity }) => ({
      name,
      version,
      integrity,
    })),
    "Immutable release artifact conflict",
  );
}

function lookup(tag, runGh = gh) {
  try {
    return JSON.parse(
      runGh(["api", `repos/${process.env.GH_REPO}/releases/tags/${tag}`]),
    );
  } catch (error) {
    if (/HTTP 404/.test(String(error.stderr))) return null;
    throw error;
  }
}

function retainedManifest(tag, destination, runGh = gh) {
  const directory = fs.mkdtempSync(path.join(destination, "retained-"));
  runGh([
    "release",
    "download",
    tag,
    "--pattern",
    "manifest.json",
    "--dir",
    directory,
  ]);
  return read(path.join(directory, "manifest.json"));
}

function record(
  command,
  destination,
  {
    runGh = gh,
    runGit = (args, options) => execFileSync("git", args, options),
    getSelection = qualifiedSelection,
  } = {},
) {
  assert.match(process.env.GH_REPO || "", /^[\w.-]+\/[\w.-]+$/);
  const release = getSelection();
  const tag = releaseTag(release.id);
  const candidate = read(path.join(destination, "manifest.json"));
  validateGraph(candidate.packages);
  for (const pkg of candidate.packages)
    assert.equal(
      integrity(path.join(destination, pkg.filename)),
      pkg.integrity,
      "Changed candidate before retention",
    );
  assert.equal(candidate.sourceCommit, process.env.WKLY_QUALIFIED_COMMIT);
  assert.equal(candidate.releaseId, release.id);
  assert.deepEqual(
    candidate.publish,
    release.publish.map(({ name, version }) => ({ name, version })),
  );
  let existing = lookup(tag, runGh);
  const workflow = `https://github.com/${process.env.GH_REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const notes = path.join(destination, "release-notes.md");
  fs.writeFileSync(
    notes,
    summary(release) +
      `\nQualified source: ${candidate.sourceCommit}\n\nWorkflow: ${workflow}\n\n` +
      (command === "complete"
        ? "Registry verification passed. Published versions and SHA-512 integrity are recorded in published.json.\n"
        : "Publication is pending. Recover with the same release ID and identical tarballs; this draft is not a completed release.\n"),
  );
  if (command === "begin") {
    if (!existing) {
      // The annotated tag names the actual qualified source, never the moving
      // branch. An existing tag must be preserved rather than force-updated.
      const ref = `refs/tags/${tag}`;
      const remote = runGit(["ls-remote", "--tags", "origin", ref], {
        encoding: "utf8",
      }).trim();
      if (!remote) {
        runGit([
          "-c",
          "user.name=github-actions[bot]",
          "-c",
          "user.email=41898282+github-actions[bot]@users.noreply.github.com",
          "tag",
          "-a",
          tag,
          candidate.sourceCommit,
          "-F",
          notes,
        ]);
        runGit(["push", "origin", ref], { stdio: "inherit" });
      } else {
        runGit(["fetch", "origin", ref]);
        assert.equal(
          runGit(["rev-parse", "FETCH_HEAD^{commit}"], {
            encoding: "utf8",
          }).trim(),
          candidate.sourceCommit,
          "Existing tag points to another source",
        );
      }
      runGh([
        "release",
        "create",
        tag,
        "--verify-tag",
        "--draft",
        "--title",
        `WKLY shared revision ${release.sharedRevision} (${release.angular.join(", ")})`,
        "--notes-file",
        notes,
      ]);
      existing = lookup(tag, runGh);
    }
    if (existing.assets.some((asset) => asset.name === "manifest.json"))
      sameCandidates(retainedManifest(tag, destination, runGh), candidate);
    else {
      assert.equal(
        existing.draft,
        true,
        "Completed release is missing its manifest",
      );
      runGh([
        "release",
        "upload",
        tag,
        path.join(destination, "manifest.json"),
      ]);
    }
    // Uploads can fail halfway through. Reconcile missing assets on every retry,
    // retaining existing bytes and the original immutable manifest.
    existing = lookup(tag, runGh);
    for (const pkg of candidate.packages) {
      const asset = existing.assets.find((item) => item.name === pkg.filename);
      if (!asset) continue;
      if (asset.digest)
        assert.equal(
          asset.digest,
          "sha256:" +
            createHash("sha256")
              .update(fs.readFileSync(path.join(destination, pkg.filename)))
              .digest("hex"),
          "Retained tarball conflict",
        );
      else {
        const directory = fs.mkdtempSync(path.join(destination, "tarball-"));
        runGh([
          "release",
          "download",
          tag,
          "--pattern",
          pkg.filename,
          "--dir",
          directory,
        ]);
        assert.equal(
          integrity(path.join(directory, pkg.filename)),
          pkg.integrity,
          "Retained tarball conflict",
        );
      }
    }
    const missing = candidate.packages.filter(
      (pkg) => !existing.assets.some((asset) => asset.name === pkg.filename),
    );
    if (missing.length)
      runGh([
        "release",
        "upload",
        tag,
        ...missing.map((pkg) => path.join(destination, pkg.filename)),
      ]);
  } else if (command === "complete") {
    assert.ok(existing, "Retain the draft before publishing");
    sameCandidates(retainedManifest(tag, destination, runGh), candidate);
    verifyReceipt(release, read(path.join(destination, "published.json")));
    assert.equal(
      read(path.join(destination, "published.json")).sourceCommit,
      candidate.sourceCommit,
    );
    assert.deepEqual(
      read(path.join(destination, "published.json")).packages,
      candidate.packages.map(({ name, version, integrity }) => ({
        name,
        version,
        integrity,
      })),
      "Receipt differs from retained candidates",
    );
    const trust = read(path.join(destination, "trusted-publishing.json"));
    assert.equal(trust.verified, true, "Trusted publishing is not verified");
    assert.equal(trust.sourceCommit, candidate.sourceCommit);
    assert.deepEqual(
      trust.packages.map((pkg) => pkg.name).sort(),
      [...new Set(candidate.packages.map((pkg) => pkg.name))].sort(),
      "Incomplete trusted publisher verification",
    );
    if (!existing.assets.some((asset) => asset.name === "published.json"))
      runGh([
        "release",
        "upload",
        tag,
        path.join(destination, "published.json"),
      ]);
    else {
      const directory = fs.mkdtempSync(path.join(destination, "receipt-"));
      runGh([
        "release",
        "download",
        tag,
        "--pattern",
        "published.json",
        "--dir",
        directory,
      ]);
      const receipt = read(path.join(directory, "published.json"));
      verifyReceipt(release, receipt);
      assert.deepEqual(
        receipt.packages,
        read(path.join(destination, "published.json")).packages,
        "Retained receipt conflict",
      );
    }
    if (
      !existing.assets.some((asset) => asset.name === "trusted-publishing.json")
    )
      runGh([
        "release",
        "upload",
        tag,
        path.join(destination, "trusted-publishing.json"),
      ]);
    runGh(["release", "edit", tag, "--draft=false", "--notes-file", notes]);
  } else if (command === "failure") {
    assert.ok(existing?.draft, "Expected a pending release");
    assert.match(process.env.GITHUB_RUN_ID || "", /^\d+$/);
    assert.match(process.env.GITHUB_RUN_ATTEMPT || "", /^\d+$/);
    const progress = path.join(destination, "progress.json");
    if (fs.existsSync(progress)) {
      const retained = path.join(
        destination,
        `progress-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.json`,
      );
      fs.copyFileSync(progress, retained);
      runGh(["release", "upload", tag, retained]);
    }
  } else throw new Error("Unknown record command");
  console.log(
    `Retained release: https://github.com/${process.env.GH_REPO}/releases/tag/${tag}`,
  );
}

module.exports = { sameCandidates, record };
if (require.main === module)
  record(process.argv[2], path.resolve(process.argv[3]));
