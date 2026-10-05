const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../dist/test-hosts");
const majors = Object.keys(require("../supported-angular.json"));
const port = Number(process.env.WKLY_TEST_PORT || 4318);
// Selection controls builds, not routing: a reused server must also serve hosts
// built by subsequent runs with a wider Angular selection.
function createTestHostServer(output = root) {
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      res.writeHead(405);
      res.end();
      return;
    }
    if (req.url === "/health") {
      res.end("ok");
      return;
    }
    let hostname, pathname;
    try {
      hostname = new URL(
        `http://${req.headers.host || ""}`,
      ).hostname.toLowerCase();
      pathname = new URL(req.url || "/", `http://${hostname}`).pathname;
    } catch (_) {
      res.writeHead(400);
      res.end();
      return;
    }
    const version = /^v(\d+)\.wkly\.localhost$/.exec(hostname);
    const asset = /^\/([a-zA-Z0-9_-]+\.(?:html|js|css))$/.exec(
      pathname === "/" ? "/index.html" : pathname,
    );
    if (!version || !majors.includes(version[1]) || !asset) {
      res.writeHead(404);
      res.end();
      return;
    }
    const file = path.join(output, version[1], asset[1]);
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      asset[1].endsWith(".js")
        ? "application/javascript"
        : asset[1].endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
  });
}
async function start() {
  if (process.env.WKLY_TEST_PREBUILT !== "1")
    await require("./test-host-build.cjs").buildHosts();
  createTestHostServer().listen(port, "127.0.0.1", () =>
    console.log(`Test hosts on ${port}`),
  );
}
module.exports = { createTestHostServer };
if (require.main === module)
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
