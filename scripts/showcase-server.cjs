const fs = require("fs");
const http = require("http");
const path = require("path");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function createShowcaseServer({ output, majors, domain = "wkly.localhost" }) {
  output = path.resolve(output);
  return http.createServer((req, res) => {
    const finish = (status, message) => {
      res.writeHead(status);
      res.end(message);
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return finish(405, "Method not allowed");
    }
    let hostname, pathname;
    try {
      hostname = new URL(
        `http://${req.headers.host || ""}`,
      ).hostname.toLowerCase();
      pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    } catch (_) {
      return finish(400, "Invalid request");
    }
    const version = hostname.endsWith(`.${domain}`)
      ? hostname.slice(0, -(domain.length + 1))
      : "";
    let appRoot;
    if (/^v\d+$/.test(version) && majors.includes(version.slice(1))) {
      appRoot = path.join(output, "runtime", version.slice(1));
    } else if ([domain, "localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
      appRoot = output;
    } else {
      return finish(404, "Unknown application host");
    }
    // Reject Windows path aliases too, so host isolation is identical on every OS.
    const segments = pathname.split("/").filter(Boolean);
    if (
      pathname.includes("\\") ||
      pathname.includes("\0") ||
      segments.some((segment) => /[. ]$|[<>:"|?*]/.test(segment)) ||
      segments[0]?.toLowerCase() === "runtime"
    ) {
      return finish(403, "Forbidden");
    }
    let file = path.resolve(appRoot, "." + pathname);
    if (file !== appRoot && !file.startsWith(appRoot + path.sep))
      return finish(403, "Forbidden");
    try {
      if (fs.existsSync(file) && fs.statSync(file).isDirectory())
        file = path.join(file, "index.html");
      // Missing assets are real 404s; extensionless navigation gets this app's shell.
      if (!fs.existsSync(file) && !path.extname(pathname))
        file = path.join(appRoot, "index.html");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        return finish(404, "Not found");
      const body = req.method === "HEAD" ? undefined : fs.readFileSync(file);
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.writeHead(200);
      res.end(body);
    } catch (_) {
      finish(500, "Unable to serve application");
    }
  });
}

module.exports = { createShowcaseServer };
