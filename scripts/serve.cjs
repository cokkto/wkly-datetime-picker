const fs = require("fs");
const { createShowcaseServer } = require("./showcase-server.cjs");
const { showcaseProgressPlugin } = require("./showcase-progress.cjs");
const path = require("path");
const output = path.resolve(
  __dirname,
  "..",
  process.env.WKLY_OUTPUT || "dist/showcase",
);

(async () => {
  const prebuilt = process.argv.includes("--prebuilt");
  let contexts = [];
  if (prebuilt) {
    for (const file of [
      path.join(output, "index.html"),
      path.join(output, "main.js"),
      path.join(output, "main.css"),
    ]) {
      if (!fs.existsSync(file))
        throw new Error(`Missing showcase asset: ${file}`);
    }
  } else {
    const { assets, builds } = require("./showcase-build.cjs");
    assets();
    contexts = await Promise.all(
      builds.map(async ({ esbuild, options }) => {
        const label = "showcase";
        const context = await esbuild.context({
          ...options,
          plugins: [showcaseProgressPlugin(label), ...options.plugins],
        });
        await context.rebuild();
        await context.watch();
        return context;
      }),
    );
  }
  const domain = process.env.WKLY_DOMAIN || "wkly.localhost";
  const port = Number(process.env.PORT || 4200);
  const server = createShowcaseServer({
    output,
    domain,
    basePath: process.env.WKLY_BASE_PATH || "/",
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `WKLY showcase: http://${domain}:${port}${process.env.WKLY_BASE_PATH || "/"}`,
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
