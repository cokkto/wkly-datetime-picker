const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { createShowcaseServer } = require("./showcase-server.cjs");

test("public static routes, assets, base paths and invalid requests", async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-server-"));
  for (const [directory, contents] of [
    ["", "showcase"],
    ["single", "single selection"],
  ]) {
    fs.mkdirSync(path.join(output, directory), { recursive: true });
    fs.writeFileSync(path.join(output, directory, "index.html"), contents);
    fs.writeFileSync(path.join(output, directory, "main.js"), `// ${contents}`);
  }
  const server = createShowcaseServer({ output, basePath: "/demo/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const request = (host, route, method = "GET") =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path: route,
          method,
          headers: { host },
        },
        (res) => {
          let body = "";
          res.on("data", (data) => (body += data));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body,
              type: res.headers["content-type"],
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
  try {
    for (const [host, body] of [
      ["wkly.localhost", "showcase"],
      ["127.0.0.1", "showcase"],
    ]) {
      const response = await request(host, "/demo/?test=1");
      assert.equal(response.status, 200);
      assert.equal(response.body, body);
      assert.equal((await request(host, "/demo/main.js")).body, `// ${body}`);
      assert.equal((await request(host, "/demo/missing.js")).status, 404);
    }
    assert.equal((await request("v22.wkly.localhost", "/demo/")).status, 404);
    assert.equal(
      (await request("wkly.localhost", "/demo/single/")).body,
      "single selection",
    );
    assert.equal(
      (await request("wkly.localhost", "/demo/cases/empty/inline")).status,
      404,
    );
    assert.equal(
      (await request("wkly.localhost", "/demo/contracts")).status,
      404,
    );
    assert.equal((await request("wkly.localhost", "/")).status, 404);
    assert.equal((await request("evil.example", "/")).status, 404);
    for (const route of [
      "/../package.json",
      "/%2e%2e/package.json",
      "/runtime/11/main.js",
      "/RUNTIME/11/main.js",
      "//runtime/11/main.js",
      "/runtime./11/main.js",
      "/runtime%20/11/main.js",
      "/..%20/package.json",
      "/main.js:stream",
      "/%5c..%5cpackage.json",
    ]) {
      assert.equal(
        (await request("wkly.localhost", "/demo" + route)).status,
        403,
      );
    }
    assert.equal((await request("wkly.localhost", "/demo/%zz")).status, 400);
    assert.equal(
      (await request("wkly.localhost", "/demo/", "POST")).status,
      405,
    );
    assert.equal((await request("wkly.localhost", "/demo/", "HEAD")).body, "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(output, { recursive: true, force: true });
  }
});
