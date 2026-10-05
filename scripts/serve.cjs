// Hostnames isolate independently compiled Angular testbeds on one local port.
const supported = require("../supported-angular.json");
const majors = Object.keys(supported);
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
      ...majors.map((major) =>
        path.join(output, "runtime", major, "index.html"),
      ),
      ...majors.map((major) => path.join(output, "runtime", major, "main.js")),
    ]) {
      if (!fs.existsSync(file))
        throw new Error(`Missing showcase asset: ${file}`);
    }
  } else {
    const {
      assets,
      builds,
      prepareLegacyAngular,
    } = require("./showcase-build.cjs");
    prepareLegacyAngular();
    assets();
    contexts = await Promise.all(
      builds.map(async ({ esbuild, options }, index) => {
        const label = index === 0 ? "showcase" : `Angular ${majors[index - 1]}`;
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
  const server = createShowcaseServer({ output, majors, domain });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `WKLY showcase: http://${domain}:${port} (testbeds: ${majors.map((major) => `v${major}.${domain}`).join(", ")})`,
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
