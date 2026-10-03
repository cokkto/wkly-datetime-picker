# Package compatibility CI

`supported-angular.json` is the source of truth for supported Angular majors, their numbered packages, runtime entries, and pinned Node, Angular, TypeScript, and CDK toolchains. It currently registers 11–22. The workflow is [`.github/workflows/compatibility.yml`](../.github/workflows/compatibility.yml); the planner and runner are [`scripts/compatibility.cjs`](../scripts/compatibility.cjs). This workflow tests artifacts and does not publish or change versions.

## Public package and version lines

The release target is one npm package name, `@wkly/datetime-picker`. Its major version selects the Angular integration: an Angular 19 consumer installs `@wkly/datetime-picker@19.x.x` and imports from `@wkly/datetime-picker`. The optional CDK entry point is `@wkly/datetime-picker/cdk-overlay`. Consumers pin the major because an unqualified npm install can select a different Angular line.

Versions use `N.S.A`: `N` is the Angular major, `S` is a shared revision common to every supported Angular line, and `A` is a revision local to one Angular line. A fix confined to Angular 19 advances `19.2.21` to `19.2.22` and produces only the Angular 19 picker artifact. A change to core, adapters, or shared presentation advances the common revision from `2` to `3` and produces `N.3.0` picker artifacts for every supported Angular major, resetting `A` to zero. Other shared-package artifacts change when their own source changes.

This is the release contract, not the behavior of the current CI. The workspace still builds internal `wkly-datetime-picker.N` packages; their manifests currently range from `11.0.0` to `22.0.0`, and the three shared manifests each use `0.1.0`. The planner enforces that an internal package's first version component matches its Angular suffix. Renaming the outgoing picker tarballs to `@wkly/datetime-picker`, calculating `S` and `A`, and publishing selected artifacts are [development-plan work](DEVELOPMENT-PLAN.md).

## Pipeline

On pushes, pull requests, manual dispatch, and the weekly schedule, the planner validates package metadata and builds a matrix of all registered majors. It also reports affected majors based on package dependencies. The independent shared job runs source contracts. Each Angular matrix job creates an isolated `.compat/<major>` toolchain using the pinned Node version, builds shared and numbered packages, packs tarballs, installs them in a fresh consumer, AOT compiles public imports, checks SSR, then installs optional CDK and checks its overlay entry point. The browser contract checks picker interaction and layout against the packed consumer.

The showcase job uses Node 24, installs the pnpm workspace, lints source and templates, checks server routing, builds libraries and testbeds, then runs the active browser suite on Chromium, Firefox, and WebKit. Pixel baselines are excluded from Linux CI; geometry assertions still run. The aggregate `Compatibility result` job fails if a required job fails.

The numbered source package's `package.json` declares matching Angular peer ranges. The base entry point does not require CDK; the source project's `cdk-overlay` entry point does. The consumer check verifies local tarball integrity and package entry files. CI artifacts include toolchain and consumer lockfiles, tarballs, and browser failure reports. The pnpm developer lockfile is separate from generated compatibility workspaces.

## Local commands

Run planning with a modern Node version:

```sh
npm run ci:test
npm run ci:matrix
node scripts/compatibility.cjs prepare 22
```

Switch to the Node version declared for the chosen major in `supported-angular.json`, then run:

```sh
npm run test:angular -- 22
```

`prepare` replaces the chosen generated toolchain directory. `test:angular` installs, builds, packs, AOT compiles, and checks SSR for the selected major; it replaces that major's generated consumer. For browser checks, use a modern Node installation and the workflow's browser-tool setup; the Playwright config is `projects/wkly-datetime-picker.tests/compatibility/playwright.config.cjs`.

The showcase's local browser suite can be restricted to one version:

```sh
npm run showcase:test:e2e -- --project=angular-22-chromium
```

See [developer guide](README.DEV.md) for the common loop and [test project README](../projects/wkly-datetime-picker.tests/README.md) for suite layout.

## Adding a major

Add `projects/wkly-datetime-picker.N/` and `projects/wkly-datetime-picker.runtime.N/`, register both in `pnpm-workspace.yaml`, then add the exact toolchain and runtime paths to `supported-angular.json`. Keep common behavior in shared packages and use the public API exercised by the compatibility consumer. Update the evergreen showcase's newest runtime import. Run `npm run ci:test` and `npm run ci:matrix` before the package and browser checks. An unregistered numbered package fails planner validation.
