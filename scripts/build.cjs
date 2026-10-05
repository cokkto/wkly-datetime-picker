// Build shared packages before Angular packages. Published artifacts receive the
// consumer README and API reference; project-local READMEs remain source docs.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createRequire } = require("module");
const { buildSync } = require("esbuild");
const root = path.resolve(__dirname, "..");
process.chdir(root);
let tsc;
try {
  tsc = require.resolve("wkly-shared-typescript/bin/tsc");
} catch {
  tsc = require.resolve("typescript/bin/tsc");
}
const sharedNames = Object.fromEntries(
  ["wkly-datetime-picker.core", "wkly-datetime-picker.adapters"].map((name) => [
    name,
    JSON.parse(fs.readFileSync(`projects/${name}/package.json`)).name,
  ]),
);
const supported = require("../supported-angular.json");
const selectedAngular =
  process.env.WKLY_ANGULAR ||
  (process.argv[2] ? undefined : Object.keys(supported).at(-1));
const angularPackages = Object.entries(supported)
  .filter(([major]) => !selectedAngular || major === selectedAngular)
  .map(([, info]) => info.package);
for (const name of [
  "wkly-datetime-picker.core",
  "wkly-datetime-picker.adapters",
  "wkly-datetime-picker",
  ...angularPackages,
]) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const project = path.join("projects", name);
  const out = path.join("dist", name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  if (!angularPackages.includes(name)) {
    buildSync({
      entryPoints: [project + "/src/public-api.ts"],
      outfile: out + "/index.js",
      bundle: true,
      format: "esm",
      platform: "neutral",
      target: "es2018",
      external: Object.values(sharedNames),
    });
    buildSync({
      entryPoints: [project + "/src/public-api.ts"],
      outfile: out + "/index.cjs",
      bundle: true,
      format: "cjs",
      platform: "node",
      target: "node16",
      external: Object.values(sharedNames),
    });
    const paths = {
      [sharedNames["wkly-datetime-picker.core"]]: [
        "dist/wkly-datetime-picker.core/public-api.d.ts",
      ],
    };
    if (name === "wkly-datetime-picker")
      paths[sharedNames["wkly-datetime-picker.adapters"]] = [
        "dist/wkly-datetime-picker.adapters/public-api.d.ts",
      ];
    const config = {
      extends: fs.existsSync("tsconfig.shared.json")
        ? "../../tsconfig.shared.json"
        : "../../tsconfig.json",
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: "../../dist/" + name,
        rootDir: "src",
        paths,
        types: [],
      },
      include: ["src/**/*.ts"],
    };
    const configFile = project + "/tsconfig.lib.json";
    if (
      !fs.existsSync(configFile) ||
      JSON.stringify(JSON.parse(fs.readFileSync(configFile, "utf8"))) !==
        JSON.stringify(config)
    )
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");
    execFileSync(
      process.execPath,
      [tsc, "-p", project + "/tsconfig.lib.json"],
      { stdio: "inherit" },
    );
    const manifest = JSON.parse(fs.readFileSync(project + "/package.json"));
    delete manifest.scripts;
    fs.writeFileSync(
      out + "/package.json",
      JSON.stringify(
        {
          ...manifest,
          main: "index.cjs",
          module: "index.js",
          types: "public-api.d.ts",
        },
        null,
        2,
      ),
    );
    if (name === "wkly-datetime-picker")
      fs.copyFileSync(
        project + "/src/picker.component.css",
        out + "/picker.css",
      );
  } else {
    const packager = createRequire(path.resolve(project, "package.json"));
    const packagerManifest = packager.resolve("ng-packagr/package.json");
    const packagerBin = JSON.parse(fs.readFileSync(packagerManifest, "utf8"))
      .bin["ng-packagr"];
    execFileSync(
      process.execPath,
      [
        path.resolve(path.dirname(packagerManifest), packagerBin),
        "-p",
        project + "/ng-package.json",
        "-c",
        project + "/tsconfig.lib.json",
      ],
      { stdio: "inherit" },
    );
  }
  fs.copyFileSync("LICENSE", out + "/LICENSE");
  fs.copyFileSync("README.md", out + "/README.md");
  fs.copyFileSync("docs/API.md", out + "/API.md");
  const builtManifest = JSON.parse(fs.readFileSync(out + "/package.json"));
  delete builtManifest.scripts;
  if (builtManifest.files && !builtManifest.files.includes("API.md"))
    builtManifest.files.push("API.md");
  fs.writeFileSync(
    out + "/package.json",
    JSON.stringify(builtManifest, null, 2),
  );
  const link = path.join(root, "node_modules", builtManifest.name);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  if (!fs.existsSync(link))
    fs.symlinkSync(path.join(root, out), link, "junction");
}
