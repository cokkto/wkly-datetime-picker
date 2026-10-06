const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const supported = require("../supported-angular.json");
const metadata = require("../projects/wkly-datetime-picker.showcase/src/page-metadata.json");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.WKLY_OUTPUT || "dist/showcase");
const hostRoot = path.join(root, "projects/wkly-datetime-picker.showcase");
const {
  angularPlugin,
  runtimeDependenciesPlugin,
} = require("./angular-build.cjs");
const latest = Object.keys(supported)
  .sort((a, b) => Number(a) - Number(b))
  .at(-1);
const runtimeRoot = path.join(
  root,
  `projects/wkly-datetime-picker.runtime.${latest}`,
);
const runtimeRequire = createRequire(path.join(runtimeRoot, "package.json"));
const hostConfig = path.join(hostRoot, "tsconfig.host.json");
const basePath = process.env.WKLY_BASE_PATH || "/";
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath))
  throw new Error(
    "WKLY_BASE_PATH must be an absolute directory path ending in /",
  );
const siteUrl = process.env.WKLY_SITE_URL;
if (
  siteUrl &&
  (!/^https?:\/\//.test(siteUrl) || new URL(siteUrl).pathname !== basePath)
)
  throw new Error(
    "WKLY_SITE_URL must be an HTTP(S) URL whose path matches WKLY_BASE_PATH",
  );
const builds = [
  {
    esbuild: runtimeRequire("esbuild"),
    options: {
      absWorkingDir: root,
      entryPoints: ["projects/wkly-datetime-picker.showcase/src/main.ts"],
      outdir: output,
      bundle: true,
      format: "iife",
      minify: process.env.WKLY_E2E !== "1",
      target: "es2018",
      conditions: ["style"],
      tsconfig: hostConfig,
      plugins: [
        runtimeDependenciesPlugin(runtimeRoot, hostRoot),
        angularPlugin(
          runtimeRequire("typescript"),
          hostConfig,
          createRequire(
            path.join(
              root,
              `projects/wkly-datetime-picker.${latest}/package.json`,
            ),
          )("@angular/compiler-cli"),
          Number(latest),
        ),
      ],
      define: { WKLY_E2E: process.env.WKLY_E2E === "1" ? "true" : "false" },
    },
  },
];
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
function assets() {
  fs.mkdirSync(output, { recursive: true });
  // A rebuild must not leave the removed testbed apps in the deployment artifact.
  const obsoleteRuntime = path.resolve(output, "runtime");
  if (path.dirname(obsoleteRuntime) !== output || output === root)
    throw new Error("Showcase output must be a dedicated build directory");
  fs.rmSync(obsoleteRuntime, { recursive: true, force: true });
  for (const name of ["main.js.map", "main.css.map", "sitemap.xml"])
    fs.rmSync(path.join(output, name), { force: true });
  const template = fs.readFileSync(
    path.join(hostRoot, "src/index.html"),
    "utf8",
  );
  const navigation = Object.entries(metadata)
    .map(
      ([route, page]) =>
        `<li><a href="${basePath}${route ? route + "/" : ""}">${escapeHtml(page.title)}</a></li>`,
    )
    .join("");
  for (const [route, page] of Object.entries(metadata)) {
    const url = siteUrl ? new URL(route ? route + "/" : "", siteUrl).href : "";
    const tags =
      `<meta name="description" content="${escapeHtml(page.description)}">` +
      `<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(page.title)}">` +
      `<meta property="og:description" content="${escapeHtml(page.description)}">` +
      (url
        ? `<link rel="canonical" href="${escapeHtml(url)}"><meta property="og:url" content="${escapeHtml(url)}">`
        : "");
    // Every public route has real HTML and a 200 response on static hosts.
    // Angular replaces the readable landing content when the live demo boots.
    const html = template
      .replace('<base href="/" />', `<base href="${basePath}" />`)
      .replace(
        /<title>.*?<\/title>/,
        `<title>${escapeHtml(page.title)}</title>${tags}`,
      )
      .replace(
        "<wkly-showcase></wkly-showcase>",
        `<wkly-showcase><main><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><nav aria-label="Examples"><ul>${navigation}</ul></nav><p><a href="https://github.com/cokkto/wkly-datetime-picker">Documentation and source</a></p></main></wkly-showcase>`,
      );
    const directory = path.join(output, route);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), html);
  }
  fs.writeFileSync(path.join(output, ".nojekyll"), "");
  if (siteUrl) {
    const urls = Object.keys(metadata)
      .map(
        (route) =>
          `<url><loc>${escapeHtml(new URL(route ? route + "/" : "", siteUrl).href)}</loc></url>`,
      )
      .join("");
    fs.writeFileSync(
      path.join(output, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
  }
}
module.exports = { assets, builds, basePath };
if (require.main === module) {
  assets();
  Promise.all(
    builds.map(({ esbuild, options }) => esbuild.build(options)),
  ).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
