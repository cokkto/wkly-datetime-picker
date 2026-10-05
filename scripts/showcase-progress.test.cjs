const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");
const { showcaseProgressPlugin } = require("./showcase-progress.cjs");

test("watch notifications follow successful rebuilds, failures and recovery", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-progress-"));
  const entry = path.join(directory, "main.js");
  const output = path.join(directory, "out.js");
  const messages = [];
  let context;
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 10000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, `Timed out: ${messages.join("\n")}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  try {
    fs.writeFileSync(entry, 'console.log("initial");');
    context = await esbuild.context({
      entryPoints: [entry],
      outfile: output,
      logLevel: "silent",
      plugins: [
        showcaseProgressPlugin("showcase", (message) => messages.push(message)),
      ],
    });
    await context.watch();
    await waitFor(() =>
      messages.some((message) => message.includes("Built in")),
    );
    assert.equal(messages[0], "WKLY [showcase]: Building...");
    assert.match(messages[1], /Built in \d+ms\. Refresh the browser\.$/);

    messages.length = 0;
    fs.writeFileSync(entry, 'console.log("changed");');
    await waitFor(() =>
      messages.some((message) => message.includes("Rebuilt in")),
    );
    assert.equal(messages[0], "WKLY [showcase]: Rebuilding...");
    assert.match(messages[1], /Rebuilt in \d+ms\. Refresh the browser\.$/);
    // Completion must mean the updated bundle is already available to refresh.
    assert.match(fs.readFileSync(output, "utf8"), /changed/);

    messages.length = 0;
    fs.writeFileSync(entry, "const broken = ;");
    await waitFor(() => messages.some((message) => message.includes("failed")));
    assert.equal(messages[0], "WKLY [showcase]: Rebuilding...");
    assert.equal(
      messages[1],
      "WKLY [showcase]: Rebuild failed with 1 error(s).",
    );
    assert.ok(messages.every((message) => !message.includes("Refresh")));

    messages.length = 0;
    fs.writeFileSync(entry, 'console.log("recovered");');
    await waitFor(() =>
      messages.some((message) => message.includes("Rebuilt in")),
    );
    assert.match(fs.readFileSync(output, "utf8"), /recovered/);
  } finally {
    await context?.dispose();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
