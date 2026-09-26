# Package compatibility CI

`supported-angular.json` registers the Angular packages that actually exist. Currently
only `wkly-datetime-picker.11` exists; registering planned majors would incorrectly
claim support. The workflow is `.github/workflows/compatibility.yml`.

## What runs

Every push and pull request runs metadata/planner tests and the shared behavior suite.
The planner reads project package manifests and follows dependencies, peer dependencies
and development dependencies transitively. A change under an Angular package selects
that package and any consumers; a shared dependency selects all dependent majors.
Runtime iframe changes select their corresponding major. Unowned paths (including
scripts, metadata, deleted projects and documentation) conservatively select all majors.
PRs compare the merge base to the PR head; pushes compare `before` to the pushed SHA.
New branches, manual dispatches and the weekly schedule test all registered majors.
The schedule catches transitive dependency drift even without source changes.

Each selected major gets a fresh `.compat/<major>` workspace with its own pinned
toolchain, installed using npm's strict peer checks. The existing pnpm developer
workspace and its lockfile are not used or modified. Shared packages build first,
then the selected Angular package runs its own ng-packagr configuration. Package
boundaries and npm pack contents are checked. Actual tarballs are installed into a
fresh consumer, including local shared packages instead of registry copies.

The consumer AOT compiles public package imports and discovered secondary ng-packagr
entry points. One reusable browser contract checks Gregorian adapter rendering,
date selection, reactive form updates in both directions and disabled state. A
server-rendering contract checks shared imports without Angular and rendering without
reading the clock. Playwright uses Node 24 independently of the library toolchain.
The shared core/adapter behavior contracts run once rather than once per major.
The showcase's UI/iframe bridge suite remains available through
`npm run showcase:test:e2e`; it is separate from this package compatibility workflow.

Use **Compatibility result** as the required branch check. It fails if planning,
shared tests or any selected compatibility job fails, while allowing an empty matrix.

The first clean consumer run exposed missing picker/dialog exports in Angular 11's
flattened package bundle. Its public barrel now explicitly re-exports those symbols
so declarations and executable exports agree; the public API is unchanged.

## Adding Angular 12, 13, or a later major

1. Add `projects/wkly-datetime-picker.N` with version `N.SharedRevision.AngularRevision`,
   its appropriate Angular peer ranges, and ng-packagr/TypeScript configs. Keep business
   logic in shared packages. Export the same picker/module API used by the harness.
2. Add an `N` entry to `supported-angular.json`: `package`, `node`, and exact versions
   in `dependencies` for its Angular/CLI/ng-packagr/TypeScript/RxJS toolchain. Include
   any additional dependencies needed by its secondary entry points and SSR.
   Start from the existing entry, then choose compatible versions; do not simply
   replace every version number with N. `builder` optionally overrides the consumer
   builder, which must support the Angular CLI browser builder option contract.
3. Add `runtimeEntry`, `runtimeHtml`, and `toolchain` when registering its showcase
   iframe. Those fields serve the existing showcase; CI builds the package directly.
4. Run `npm run ci:test` and `npm run ci:matrix`, then push. No workflow copy, matrix
   edit, or committed per-major lockfile is necessary. Unregistered numbered packages
   fail validation instead of silently escaping CI.

Removing support means removing the metadata entry and its numbered project together;
remove the corresponding showcase runtime too if present. Historical tags remain.
Future majors may require changes to the shared harness if Angular removes APIs;
metadata cannot manufacture a compatible Angular implementation.

## Local commands

```sh
# Node 22+ for generation and planner tests
npm run ci:test
npm run ci:matrix
node scripts/compatibility.cjs prepare 11

# Switch to the Node version declared for 11, then:
npm run test:angular -- 11
```

`prepare` replaces only `.compat/11`. `test:angular` installs, builds, packs, AOT
compiles and runs SSR. Browser tests use a separate modern Node installation:

```sh
npm install --prefix .compat/browser --no-audit --no-fund @playwright/test@1.58.2
node .compat/browser/node_modules/@playwright/test/cli.js install chromium
NODE_PATH="$PWD/.compat/browser/node_modules" ANGULAR_MAJOR=11 \
  node .compat/browser/node_modules/@playwright/test/cli.js test --config tests/compatibility/playwright.config.cjs
```

On PowerShell set `$env:NODE_PATH` and `$env:ANGULAR_MAJOR` before the last command.
See the workflow for the equivalent Linux runner steps.

## Dependency policy and run diagnostics

Direct compatibility dependencies are pinned in the manifest. Transitive dependencies
resolve on a fresh run, deliberately avoiding twelve large committed lockfiles.
Both generated install lockfiles, packed tarballs, and failure traces are uploaded as
`compatibility-N` artifacts. This gives a record of the actual dependency resolution;
it does not promise identical transitive dependencies between separate fresh runs.
To reproduce an install failure, download its locks, put each beside the corresponding
generated package.json, and use `npm ci` with the same Node/npm versions from the logs.

Angular 11 retains this repository's Node 16 build baseline and shared package engine
requirement; this is a tested project combination, not Angular 11's original official
Node support range. Consult [Angular's toolchain table](https://angular.dev/reference/versions)
when choosing toolchains for new majors.

```sh
gh run list --branch YOUR_BRANCH --workflow compatibility.yml
gh run watch RUN_ID --exit-status
gh run view RUN_ID --log-failed
gh run download RUN_ID --name compatibility-11
# After the workflow is present on the default branch:
gh workflow run compatibility.yml --ref YOUR_BRANCH
```

## Versioning and release scope

This implements testing, not publishing or version increments. It follows the
`Angular.SharedRevision.AngularRevision` decision: the first version component must
match the package suffix. Shared revisions and Angular-specific revisions retain
their project meanings, not ordinary SemVer compatibility promises. Exact dependency
pins are appropriate when consuming a particular shared generation.

Development stays on `main` with short-lived review branches. No Angular-specific
maintenance branches are introduced. Publishing, synchronized shared revisions, tags
and release recovery remain separate release automation work; this workflow never
publishes, tags or changes package versions.
