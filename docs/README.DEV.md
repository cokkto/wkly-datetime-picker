# Developer guide

## Setup and quick loop

Run commands from the repository root. Install the pnpm workspace first:

```sh
corepack pnpm install
npm run test:browsers:install
npm run lint
npm test
npm run showcase:start
```

Use Node 24.15+ for the combined showcase build and Playwright driver. Compatibility builds use the per-major Node and TypeScript versions recorded in [`supported-angular.json`](../supported-angular.json); use the [compatibility guide](COMPATIBILITY-CI.md) for those isolated toolchains. The package manager is pinned in [`package.json`](../package.json).

The watcher serves the evergreen showcase at `http://wkly.localhost:4200` (also `http://127.0.0.1:4200`), and versioned testbeds at `http://v11.wkly.localhost:4200` through `http://v22.wkly.localhost:4200`. Open a testbed's `/cases/empty/<example-id>` route for a minimal fixture. See [showcase usage](SHOWCASE.md) for layouts, host settings, and test controls.

Picker domain tests use the same versioned hostnames on port 4318, with `/index.html` serving each version's minimal fixture app. `WKLY_TEST_PORT` selects another port. Startup verifies each selected virtual host over loopback before launching browser workers; see the [test README](../projects/wkly-datetime-picker.tests/README.md).

## Checks

| Command                                                             | Scope                                                                                                            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm test` / `npm run test:dev`                                     | Fast development: source contracts plus all picker domains for newest Angular/Chromium                           |
| `npm run test:push`                                                 | Before pushing: tooling, lint, types, contracts and oldest/newest Angular/Chromium                               |
| `npm run test:pr`                                                   | Full behavior gate for PRs: all registered Angular versions and engines, shared-package checks and showcase      |
| `npm run test:release`                                              | Pre-release qualification: PR gate plus fresh Angular packages, isolated installs, base/CDK AOT, SSR and startup |
| `npm run test:picker -- --project=angular-22-chromium-navigation`   | Focus one domain with native Playwright filters; rebuilds selected hosts unless explicitly marked prebuilt       |
| `npm run test:showcase`                                             | Current showcase journeys; run `npm run showcase:build` first                                                    |
| `npm run test:contracts`                                            | Pure source contracts in UTC and America/New_York                                                                |
| `npm run test:packages:shared`                                      | Fresh installed shared-package contracts                                                                         |
| `npm run test:packages:angular`                                     | Fresh full Angular package qualification; requires pinned Node executables                                       |
| `npm run test:packages:angular:reuse`                               | Revalidate existing Angular artifacts; does not qualify fresh libraries                                          |
| `npm run test:tooling`, `test:lint`, `test:typecheck`               | Individual static/tooling checks                                                                                 |
| `npm run test:visuals:update`                                       | Update the four current month-boundary images per engine                                                         |
| `npm run test:browsers:install`                                     | Install Chromium, Firefox and WebKit                                                                             |
| `npm run test:report`, `test:report:packed`, `test:report:showcase` | Open native Playwright HTML reports                                                                              |
| `npm run format`                                                    | Format every set of file edits                                                                                   |

Development accepts `WKLY_TEST_ANGULAR` and `WKLY_TEST_BROWSERS` for focused work. Push always checks the oldest and newest versions with Chromium. PR and release always use the complete registry/engine matrix, regardless of leftover selection variables. All profiles rebuild their selected picker hosts. `test:all` remains an alias for release qualification; `test:all:update` deliberately updates screenshots before that gate.

Use development checks while editing and the push gate before pushing. `test:pr` is the full local behavior gate; GitHub PR checks additionally qualify fresh Angular packages in parallel per-version jobs. Pushes to main and manual dispatch use the same complete CI gate. Before publishing, run fresh release qualification for the exact release source. `test:release -- --reuse-packed` is an explicitly weaker repeat check. See [compatibility CI](COMPATIBILITY-CI.md#pipeline) for jobs and required checks, and the [test coverage index](TEST-DOMAINS.md) for assertions.

Browser results use Playwright's built-in list, HTML, JSON and JUnit reporters. GitHub Actions also receives native failure annotations. HTML folders are `playwright-report/`, `playwright-report-packed/` and `playwright-report-showcase/`; `npm run test:report` opens the picker report. Profile JSON/XML and stage summaries are kept separately under `.test-build/checks/<profile>/`. Component commands use `.test-build/domains/results.json`, `packed-results.json` and `showcase-results.json`, with matching XML files. HTML folders contain the latest run of each suite.

To capture all terminal output, including non-browser installs and builds, in PowerShell:

```powershell
New-Item -ItemType Directory -Force .test-build | Out-Null
npm run test:release 2>&1 | Tee-Object .test-build/release.log
```

CI uploads HTML, JSON, JUnit and failure attachments for every browser job, even on failure. Download an artifact and open its HTML report with `node scripts/playwright.cjs show-report <downloaded-report-folder>`. JUnit XML is compatible with standard GitHub test-report integrations. The root formatter covers TypeScript, HTML, CSS, CommonJS and JSON, but not Markdown. Review Markdown directly.

For slowness analysis, sort tests by duration in the native HTML report. Profile summaries separate stage elapsed times; `.test-build/packed-timings.json` separates package preparation, per-version qualification and browser startup. Fresh compatibility runs also write `.compat/<major>/timings.json`, separating dependency installs, library builds, pack checks, base/CDK consumer AOT and SSR. These package timing files describe the latest component run, rather than preserving a history.

### Playwright filters and screenshot updates

Pass Playwright arguments after `--`. Use `--project` to select one Angular version and browser; without it, matching tests run across all configured projects. `--grep` matches test titles using a regular expression, and `$` anchors the end of the title.

Run one showcase project (after `npm run showcase:build`):

```sh
npm run test:showcase -- --project=angular-22-chromium-showcase
```

Run all tests and record local elapsed time:

```sh
npm run test:all
```

Regenerate all current visual baselines, then run the same full suite:

```sh
npm run test:all:update
```

For snapshots alone, use `npm run test:visuals:update`. Baselines live under `projects/wkly-datetime-picker.tests/baselines/<platform>/<engine>/` and are shared across Angular versions. Windows baselines are checked in; picker CI runs on Windows to use them. Other operating systems need reviewed baselines. The update runner picks the newest selected registered version, with one writer per engine. The full runner builds selected picker hosts once, then reuses them for updates and comparisons.

Clear `WKLY_TEST_ANGULAR` and `WKLY_TEST_BROWSERS` to test the complete default matrix. See the [test README](../projects/wkly-datetime-picker.tests/README.md) for pinned Node prerequisites, optional packed-artifact reuse and the timing report. Snapshot updates do not bypass geometry assertions.

## Package release model

The public picker name is `@wkly/datetime-picker`, with `N.S.A` versions for Angular 11–22. The numbered `projects/wkly-datetime-picker.N/` directories are build targets. A change confined to one Angular integration advances only its `A` component and produces one picker artifact; a change to core, adapters, or shared presentation advances `S` for every major and produces `N.(S+1).0` picker artifacts for the full matrix. The compatibility pipeline builds and tests public npm artifacts from isolated copies of the internal projects. The [publication workflow](PUBLICATION.md) publishes reviewed, qualified tarballs; automatic revision calculation remains future work. See [compatibility and versioning](COMPATIBILITY-CI.md) and the [development plan](DEVELOPMENT-PLAN.md).

## Working on a change

1. Read the relevant domain document from the [index](README.md), then inspect its source and tests.
2. Add or update a focused contract or browser assertion when behavior changes. Run the smallest relevant check, then the wider gate appropriate to the affected package. Shared changes affect all Angular majors in compatibility CI.
3. Run `npm run format` after the file updates. Run `npm run lint` and `npm test` for ordinary source changes; use packed-consumer and browser checks when their public contract or UI is affected.
4. Update the [development plan](DEVELOPMENT-PLAN.md) when a milestone advances or a new issue appears. Put reproduction evidence and status in [REGRESSIONS.md](REGRESSIONS.md) for regressions. Keep the [consumer README](../README.md) and [API reference](API.md) aligned with public behavior.

`npm run test:visuals:update` intentionally rewrites snapshots; do not use it to make a failing geometry assertion pass.
