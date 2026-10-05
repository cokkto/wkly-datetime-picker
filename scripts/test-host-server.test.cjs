const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { checkTestHosts } = require("./test-host-setup.cjs");
// Reproduce a server loaded during a narrow development run. Restore the
// environment after import; routing must not retain that build selection.
const selection = process.env.WKLY_TEST_ANGULAR;
process.env.WKLY_TEST_ANGULAR = "22";
let createTestHostServer;
try {
  ({ createTestHostServer } = require("./test-host-server.cjs"));
} finally {
  if (selection === undefined) delete process.env.WKLY_TEST_ANGULAR;
  else process.env.WKLY_TEST_ANGULAR = selection;
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
function request(baseURL, hostname, route = "/index.html", method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: new URL(baseURL).port,
        path: route,
        method,
        headers: { host: `${hostname}:${new URL(baseURL).port}` },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body,
            type: res.headers["content-type"],
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("a reused server serves newly built registered hosts and reports missing hosts before workers start", async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-test-host-"));
  const build = (major) => {
    fs.mkdirSync(path.join(output, major), { recursive: true });
    fs.writeFileSync(
      path.join(output, major, "index.html"),
      "<test-host></test-host>",
    );
    fs.writeFileSync(
      path.join(output, major, "main.js"),
      `// Angular ${major}`,
    );
  };
  build("22");
  const server = createTestHostServer(output);
  const url = await listen(server);
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    await checkTestHosts(url, ["22"]);
    await assert.rejects(checkTestHosts(url, ["12", "22"]), (error) => {
      assert.match(
        error.message,
        /v12\.wkly\.localhost:\d+\/index.html: HTTP 404/,
      );
      assert.match(error.message, /Stop the existing test-host server/);
      assert.match(error.message, /WKLY_TEST_PORT/);
      return true;
    });
    // Widening the build selection must not require restarting this server.
    build("12");
    await checkTestHosts(url, ["12", "22"]);
    const script = await request(url, "v12.wkly.localhost", "/main.js");
    assert.equal(script.type, "application/javascript");
    assert.equal(script.body, "// Angular 12");
    assert.equal(
      (await request(url, "v22.wkly.localhost", "/main.js")).body,
      "// Angular 22",
    );
    assert.equal((await request(url, "V12.WKLY.LOCALHOST", "/")).status, 200);
    assert.equal(
      (await request(url, "v12.wkly.localhost", "/main.js?reload=1")).body,
      "// Angular 12",
    );
    assert.equal(
      (await request(url, "v12.wkly.localhost", "/index.html", "HEAD")).body,
      "",
    );
    assert.equal(
      (await request(url, "v12.wkly.localhost", "/index.html", "POST")).status,
      405,
    );
    for (const route of ["/22/main.js", "/missing.js", "/../22/main.js"])
      assert.equal(
        (await request(url, "v12.wkly.localhost", route)).status,
        404,
      );
    for (const hostname of [
      "v99.wkly.localhost",
      "v12.wkly.localhost.evil.example",
      "evil.example",
      "127.0.0.1",
    ])
      assert.equal((await request(url, hostname)).status, 404);
  } finally {
    await close(server);
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test("a healthy unrelated server cannot satisfy picker startup checks", async () => {
  const server = http.createServer((req, res) => res.end("ok"));
  const url = await listen(server);
  try {
    await assert.rejects(checkTestHosts(url, ["22"]), /not a picker test host/);
  } finally {
    await close(server);
  }
});
