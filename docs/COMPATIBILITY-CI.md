# Package compatibility CI

`supported-angular.json` is the source of truth for supported Angular majors, their numbered packages, runtime entries, and pinned Node, Angular, TypeScript, and CDK toolchains. It currently registers 11–22. The workflow is [`.github/workflows/compatibility.yml`](../.github/workflows/compatibility.yml); the planner and runner are [`scripts/compatibility.cjs`](../scripts/compatibility.cjs). This workflow tests public npm artifacts and does not publish or change versions. The manually dispatched [publication workflow](PUBLICATION.md) consumes its qualified tarballs.

Angular 22 pins `@angular/build` directly at the same version as `@angular-devkit/build-angular`. Keep these pins aligned: the direct dependency avoids npm's nested build/Vite/SSL peer placement failure during fresh strict installs, including packed consumers.

## Public package and version lines

The release target is one npm package name, `@wkly/datetime-picker`. Its major version selects the Angular integration: an Angular 19 consumer installs `@wkly/datetime-picker@19.x.x` and imports from `@wkly/datetime-picker`. The optional CDK entry point is `@wkly/datetime-picker/cdk-overlay`. Consumers pin the major because an unqualified npm install can select a different Angular line.

Versions use `N.S.A`: `N` is the Angular major, `S` is a shared revision common to every supported Angular line, and `A` is a revision local to one Angular line. A fix confined to Angular 19 advances `19.2.21` to `19.2.22` and produces only the Angular 19 picker artifact. A change to core, adapters, or shared presentation advances the common revision from `2` to `3` and produces `N.3.0` picker artifacts for every supported Angular major, resetting `A` to zero. Other shared-package artifacts change when their own source changes.

`release-state.json` records `S`, source-input fingerprints and versions. The [release planner](../scripts/release-plan.cjs) calculates `A` increments for changed integrations, or advances `S` and resets `A` for every major when shared inputs change. Shared packages receive patch increments when their own inputs or exact outgoing shared dependencies change. The workspace builds internal `wkly-datetime-picker.N` packages. Isolated workspaces map artifacts to `@wkly/datetime-picker` and shared dependencies to `@wkly/core`, `@wkly/adapters`, and `@wkly/presentation`. ng-packagr compiles the public names and CDK entry points directly. See [release preparation and publishing](PUBLICATION.md).

## Pipeline

Pushes to `main`, pull requests targeting `main` and manual dispatch run the gate. Picker/browser coverage always spans every registered major; showcase smoke checks use only the newest Angular runtime across all three engines. Package qualification normally spans every major too; an applied release plan with unchanged recorded inputs limits fresh package jobs to its affected picker lines. Thus an Angular-only version PR builds its one new picker line, alongside unchanged shared dependencies needed for base/CDK verification. A shared revision qualifies all majors. Unprepared source changes get full package coverage and cannot publish until their versions are prepared. Newer runs on the same ref cancel obsolete runs.

| Job                       | Runner                          | Checks                                                                                                                              |
| ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `plan`                    | Linux, Node 24                  | Validate registry/packages and produce the full Angular matrix                                                                      |
| `shared`                  | Linux, Node 24                  | Tooling/server contracts, all source/template lint, test types, source contracts and freshly installed shared-package contracts     |
| `picker` × Angular major  | Windows, Node 24                | Build only that major's picker host; run every supported domain on Chromium/Firefox/WebKit with fixture/context/page reuse auditing |
| `angular` × release major | Linux, pinned Node then Node 24 | Fresh isolated libraries, tarballs and base/CDK installs, public-import AOT and SSR, then packed startup on all three browsers      |
| `showcase` × browser      | Linux, Node 24                  | Build the public showcase; check that engine's compiled controls and initial state on every public route                               |
| `result`                  | Linux                           | Require every job and matrix to succeed, including failures, cancellations or unexpected skips                                      |

Picker jobs pin `windows-2025-vs2026` and use two browser workers (`CI=true`); local picker runs keep six. Screenshots include all four month-boundary cases per engine. Firefox on Actions uses `baselines/win32-server2025/firefox`, since Windows Server text rasterization differs from local Windows; other engines and local Firefox keep `baselines/win32/<engine>`. Both variants remain shared across Angular versions and use the same strict comparison settings. Update server references only from reviewed screenshots captured on the pinned runner. Touch input runs Chromium only; desktop domains run all three engines. Package and showcase jobs use Linux and have no screenshot baseline dependency. The [test coverage index](TEST-DOMAINS.md) links the exact specs.

Heavy jobs have `timeout-minutes: 25` individually; plan/result have five minutes. The workflow uses separate jobs rather than the sequential local release command. Matrix fail-fast is disabled so failures in one version do not hide results from others. The pnpm store is cached by lockfile; workspace installs are frozen, and each package job regenerates and installs fresh compatibility artifacts.

The aggregate check is named **Compatibility result**. Configure it as the required branch-protection check for `main` in GitHub repository settings. The workflow runs on ordinary `pull_request` events with read-only contents permission and does not require publication secrets.

The numbered source package's `package.json` declares matching Angular peer ranges. The base entry point does not require CDK; the source project's `cdk-overlay` entry point does. The consumer check verifies local tarball integrity and entry files. CI artifacts include toolchain/consumer lockfiles, tarballs, per-major package timings, picker reuse/build summaries and native Playwright HTML/JSON/JUnit plus failure attachments. Browser failures also receive native GitHub annotations. Artifact names include their Angular version or browser; each uploads even when tests fail. The pnpm developer lockfile is separate from generated compatibility workspaces.

## Local commands

Run planning with a modern Node version:

```sh
npm run test:tooling
npm run ci:matrix
node scripts/compatibility.cjs prepare 22
```

Switch to the Node version declared for the chosen major in `supported-angular.json`, then run:

```sh
npm run test:packages:angular:version -- 22
```

`prepare` replaces the chosen generated toolchain directory. `test:packages:angular:version` installs, builds, packs, AOT compiles and checks SSR for the selected major; it replaces that major's generated consumer. Switch back to modern Node for Playwright; `npm run test:packages:angular:reuse` rechecks those installed artifacts with AOT, SSR and browser journeys. Set `WKLY_TEST_ANGULAR` to that major and provide its pinned Node executable as described in the [test README](../projects/wkly-datetime-picker.tests/README.md#package-checks).

The showcase's local smoke suite can be restricted to one browser:

```sh
npm run test:showcase -- --project=chromium-showcase
```

See [developer guide](README.DEV.md) for the common loop and [test project README](../projects/wkly-datetime-picker.tests/README.md) for suite layout.

## Adding a major

Add `projects/wkly-datetime-picker.N/` and `projects/wkly-datetime-picker.runtime.N/`, register both in `pnpm-workspace.yaml`, then add the exact toolchain dependencies to `supported-angular.json`. Keep common behavior in shared packages and use the public API exercised by the compatibility consumer. Update the evergreen showcase's newest runtime import. Run `npm run test:tooling` and `npm run ci:matrix` before the package and browser checks. An unregistered numbered package fails planner validation.

For the complete local gate use `npm run test:release` (also `test:all`): it rebuilds every registered pinned compatibility toolchain and fresh consumer, including base-without-CDK, AOT, SSR and all three engines. `test:release -- --reuse-packed` is a weaker repeat check of existing artifacts. Stage/total timings are saved in `.test-build/checks/release/summary.json`. `test:pr` runs the full local behavior matrix without Angular package qualification; CI adds that qualification in parallel jobs. See the [developer guide](README.DEV.md#checks) for faster development/push commands.
