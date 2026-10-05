const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { majors } = require("../../../../scripts/test-host-selection.cjs");
const root = path.resolve(__dirname, "../../../..", ".compat");
for (const major of majors)
  if (!fs.existsSync(path.join(root, `consumer-${major}`, "public/index.html")))
    throw new Error(`Build the packed Angular ${major} consumer first`);
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/health") {
      res.end("ready");
      return;
    }
    const [, major, ...segments] = url.pathname.split("/");
    const folder = path.join(root, `consumer-${major}`, "public");
    const file = path.resolve(folder, segments.join("/") || "index.html");
    if (
      !majors.includes(major) ||
      !file.startsWith(folder + path.sep) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "application/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    // Consumers use root-relative base URLs when compiled for their standalone host.
    if (file.endsWith("index.html"))
      res.end(
        fs
          .readFileSync(file, "utf8")
          .replace('<base href="/">', `<base href="/${major}/">`),
      );
    else fs.createReadStream(file).pipe(res);
  })
  .listen(Number(process.env.WKLY_PACKED_PORT || 4321), "127.0.0.1");
