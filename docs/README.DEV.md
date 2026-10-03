# Developer guide

## Setup and quick loop

Run commands from the repository root. Install the pnpm workspace first:

```sh
corepack pnpm install
npm run lint
npm test
npm run showcase:start
```

Use Node 24.15+ for the combined showcase build and Playwright driver. Compatibility builds use the per-major Node and TypeScript versions recorded in [`supported-angular.json`](../supported-angular.json); use the [compatibility guide](COMPATIBILITY-CI.md) for those isolated toolchains. The package manager is pinned in [`package.json`](../package.json).

The watcher serves the evergreen showcase at `http://wkly.localhost:4200` (also `http://127.0.0.1:4200`), and versioned testbeds at `http://v11.wkly.localhost:4200` through `http://v22.wkly.localhost:4200`. Open a testbed's `/cases/empty/<example-id>` route for a minimal fixture. See [showcase usage](SHOWCASE.md) for layouts, host settings, and test controls.

## Checks

| Command | When to use it |
| --- | --- |
| `npm run lint` | Check scripts, TypeScript, and each Angular version's templates |
| `npm run lint -- --angular=11` | Limit lint to a registered Angular major |
| `npm test` | Run source contracts in UTC and America/New_York |
| `npm run test:installed` | Build, pack, install, and test the three shared packages in an isolated consumer |
| `npm run build` | Build shared packages and the newest Angular package; output is under `dist/` |
| `npm run pack:check` | After `npm run build`, check packaged shared and selected Angular artifacts; default Angular major is the newest |
| `npm run showcase:build` | Build the evergreen app and all versioned testbeds |
| `npm run showcase:browsers` | Install Playwright Chromium, Firefox, and WebKit engines |
| `npm run showcase:test:e2e -- --project=angular-22-chromium` | Run active browser specs for one major/browser; the full command runs all configured projects |
| `npm run showcase:test:e2e:update` | Regenerate screenshot baselines while running the full suite; use the filters below for smaller updates |
| `npm run ci:test` and `npm run ci:matrix` | Check compatibility planning and inspect the supported matrix |
| `npm run format` | Format code and configuration after every set of edits, including docs |

The root formatter currently covers TypeScript, HTML, CSS, CommonJS, and JSON, but not Markdown. Review Markdown links and formatting directly. Browser tests write reports to `playwright-report/` and `test-results/`. Screenshots use Windows baselines; run baseline updates deliberately and review the resulting images. The [test README](../projects/wkly-datetime-picker.tests/README.md) describes active suites and known coverage limits.

### Playwright filters and screenshot updates

Pass Playwright arguments after `--`. Use `--project` to select one Angular version and browser; without it, matching tests run across all configured projects. `--grep` matches test titles using a regular expression, and `$` anchors the end of the title.

Run one test:

```sh
npm run showcase:test:e2e -- --project=angular-22-chromium --grep "rendered weeks 360 zoom 1$"
```

Run two tests (`|` matches either title, and `[.]` matches a literal decimal point):

```sh
npm run showcase:test:e2e -- --project=angular-22-chromium --grep "rendered weeks 360 zoom 1$|rendered weeks 768 zoom 1[.]25$"
```

Update all three screenshot baselines in the screenshot spec for one browser profile:

```sh
npm run showcase:test:e2e:update -- --project=angular-22-chromium visual/snapshots.spec.ts
```

Update the image for just one test:

```sh
npm run showcase:test:e2e:update -- --project=angular-22-chromium visual/snapshots.spec.ts --grep "rendered weeks 360 zoom 1$"
```

The spec path also works with `showcase:test:e2e` to run that file without updating images. Repeat `--project` to select multiple browser/version profiles. Add `--list` to any of these commands to preview the selected tests without launching browsers or changing images; add `--retries=0` when investigating failures.

Screenshot baselines live in `projects/wkly-datetime-picker.tests/e2e/baselines/<browser>/` and are shared across Angular versions within each browser profile. Updating Angular 22 Chromium therefore updates the images used by the other Angular Chromium projects too.

## Package release model

The public picker name is `@wkly/datetime-picker`, with `N.S.A` versions for Angular 11–22. The numbered `projects/wkly-datetime-picker.N/` directories are build targets. A change confined to one Angular integration advances only its `A` component and produces one picker artifact; a change to core, adapters, or shared presentation advances `S` for every major and produces `N.(S+1).0` picker artifacts for the full matrix. The current compatibility pipeline builds and tests the internal packages but does not yet calculate or publish these releases. See [compatibility and versioning](COMPATIBILITY-CI.md) and the [development plan](DEVELOPMENT-PLAN.md).

## Working on a change

1. Read the relevant domain document from the [index](README.md), then inspect its source and tests.
2. Add or update a focused contract or browser assertion when behavior changes. Run the smallest relevant check, then the wider gate appropriate to the affected package. Shared changes affect all Angular majors in compatibility CI.
3. Run `npm run format` after the file updates. Run `npm run lint` and `npm test` for ordinary source changes; use packed-consumer and browser checks when their public contract or UI is affected.
4. Update the [development plan](DEVELOPMENT-PLAN.md) when a milestone advances or a new issue appears. Put reproduction evidence and status in [REGRESSIONS.md](REGRESSIONS.md) for regressions. Keep the [consumer README](../README.md) and [API reference](API.md) aligned with public behavior.

`npm run showcase:test:e2e:update` intentionally rewrites snapshots; do not use it to make a failing geometry assertion pass. CI verifies packed Angular consumers, AOT, SSR, browser contracts, and the showcase; see [compatibility CI](COMPATIBILITY-CI.md).
