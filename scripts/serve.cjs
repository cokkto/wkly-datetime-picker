const { assets, builds, majors } = require("./showcase-build.cjs");
const fs = require("fs");
const http = require("http");
const path = require("path");
const output = path.resolve(__dirname, "../dist/showcase");

(async () => {
  assets();
  const contexts = await Promise.all(
    builds.map(async ({ esbuild, options }) => {
      const context = await esbuild.context(options);
      await context.rebuild();
      await context.watch();
      return context;
    }),
  );
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    const requested = path.resolve(output, "." + pathname);
    if (!requested.startsWith(output + path.sep) && requested !== output) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = requested;
    if (
      pathname === "/" ||
      (!fs.existsSync(file) && !pathname.startsWith("/runtime/"))
    )
      file = path.join(output, "index.html");
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const type = file.endsWith(".js")
      ? "application/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".json")
          ? "application/json"
          : "text/html";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-store");
    res.end(fs.readFileSync(file));
  });
  server.listen(4200, "127.0.0.1", () =>
    console.log(
      `WKLY evergreen showcase: http://127.0.0.1:4200 (calendar runtimes: ${majors.join(", ")})`,
    ),
  );
  process.on("SIGINT", async () => {
    server.close();
    await Promise.all(contexts.map((context) => context.dispose()));
    process.exit();
  });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
