# Picker tests

The [test coverage index](../../docs/TEST-DOMAINS.md) links every current spec and its coverage. Versions come from [supported-angular.json](../../supported-angular.json); all commands run from the repository root. Use Node 24.15+ for workspace builds and the Playwright driver.

## Local checks

| Command                                                | Scope                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `npm test` / `npm run test:dev`                        | Source contracts and newest Angular/Chromium picker domains                  |
| `npm run test:push`                                    | Tooling, lint, types, source contracts and oldest/newest Chromium domains    |
| `npm run test:pr`                                      | All versions/engines, source/installed shared contracts, picker and showcase |
| `npm run test:release` / `npm run test:all`            | PR gate plus fresh Angular package qualification                             |
| `npm run test:picker`                                  | Build selected hosts and run the picker domains                              |
| `npm run showcase:build`, then `npm run test:showcase` | Build and test versioned showcase/catalogue journeys                         |
| `npm run test:browsers:install`                        | Install Chromium, Firefox and WebKit                                         |

Development and component commands accept `WKLY_TEST_ANGULAR` (for example `11,22`) and `WKLY_TEST_BROWSERS` (`chromium,firefox,webkit`). Push fixes oldest/newest Chromium; PR/release always select the full registry/engine matrix. Each profile rebuilds its selected hosts. Pass native Playwright filters after `--`:

```sh
npm run test:picker -- --project=angular-22-chromium-navigation
npm run test:showcase -- --project=angular-22-firefox-showcase
```

The picker uses `http://v11.wkly.localhost:4318/index.html` through `http://v22.wkly.localhost:4318/index.html`, matching the showcase's versioned hostname structure. `WKLY_TEST_PORT` changes the port. Each host serves only that version's fixture app and assets; `http://127.0.0.1:4318/health` checks the server process. Startup checks send the selected version's Host header over loopback, so Node does not need DNS entries for `.localhost` subdomains.

The server can be reused and serves every built registered Angular version, including hosts built after it starts. Startup checks every selected host before launching workers. If an older server reports healthy but cannot serve the selection, stop it and rerun, or set `WKLY_TEST_PORT` to an unused port. Packed/showcase ports default to 4321/4330 and accept `WKLY_PACKED_PORT`/`WKLY_SHOWCASE_PORT`.

## Browser architecture

Every version/browser/domain has one worker-owned context in America/New_York and named reusable suite pages. Angular boots once per page; each scenario mounts a new picker/form through the public host bridge, exercises behavior and destroys its fixture. Viewport/zoom pages stay within their domain. Six worker slots bound local concurrency; `CI=true` limits this to two on hosted runners.

The [registry](../../scripts/test-domains.cjs), [fixtures](e2e/fixtures.ts) and [runner](../../scripts/test-domains-run.cjs) audit fixture teardown, boot IDs and context/page counts. A complete unfiltered run rejects skips, retries or restarted pages. Filtered debug runs retain fixture lifecycle assertions but do not claim a full matrix audit.

Desktop domains run all three engines; touch uses Chromium CDP at a mobile viewport and DPR 2. This emulates input and resizing, not physical rotation or native keyboards. The hosts compile the numbered picker with its matching Angular toolchain. They expose public inputs, forms/CVA, jump and close operations, scoped configuration, native/CDK/Material presentations, and linked Gregorian/Hebrew/Hijri fixtures.

Layout screenshots share [platform/engine baselines](baselines/) across versions: four month-boundary cases per engine. Only Windows baselines are checked in, so picker CI runs on Windows. Firefox on Windows Actions selects `win32-server2025/firefox` references for the pinned server image; local Firefox and the other engines use `win32/<engine>`. See the [CI guide](../../docs/COMPATIBILITY-CI.md#pipeline) for server baseline maintenance. `npm run test:visuals:update` selects the newest chosen version and one writer per engine. Review image changes before comparing all versions. `test:all:update` updates visuals and then runs release qualification. Geometry assertions still run during updates.

## Package checks

`npm run test:contracts` runs the seven `contracts/*.spec.ts` suites using Node's native test runner in UTC and America/New_York, without browsers or Angular hosts. `test:packages:shared` builds and packs the three shared packages, installs them offline into a fresh consumer, verifies declarations, entries and CommonJS/ESM imports, then runs those same contracts. A bundle audit rejects shared source leakage.

`npm run test:packages:angular` freshly prepares every selected isolated toolchain/consumer, builds libraries and tarballs, checks base imports without CDK, then optional CDK imports, AOT, SSR without clock access and one browser startup/forms/dialog/overlay/reload journey per version/engine. It requires dependency network/cache access.

Angular build/SSR processes use the registry's pinned Node versions. Set `WKLY_NODE_<node-major>` to each executable; otherwise the runner uses the matching current Node or `.compat/node<node-major>/node_modules/node/bin/node[.exe]`. Missing prerequisites fail before builds start.

For one major, run `node scripts/compatibility.cjs prepare 22` with modern Node, switch to that major's registered Node and run `npm run test:packages:angular:version -- 22`. CI performs this separately per version and switches back to Node 24 for Playwright.

`test:packages:angular:reuse` and `test:release -- --reuse-packed` recheck existing tarballs/consumer installations and rebuild AOT fixtures. They do not qualify newly changed library artifacts.

## Reports and timings

Picker, packed and showcase suites use native Playwright list, HTML, JSON and JUnit reporters; Actions adds native GitHub failure annotations. Open HTML with `test:report`, `test:report:packed` or `test:report:showcase`. HTML folders are `playwright-report/`, `playwright-report-packed/` and `playwright-report-showcase/`; traces/failure attachments are under `test-results/`.

Profiles save results under `.test-build/checks/<profile>/<picker|packed|showcase>/` and stage times in `.test-build/checks/<profile>/summary.json`. Component JSON/XML files are `.test-build/domains/results.json`, `.test-build/packed-results.json` and `.test-build/showcase-results.json`, with matching XML. Full picker runs also write the audited `summary.json` beside their JSON report.

The HTML report exposes slow test durations. `.test-build/packed-timings.json` separates package preparation/qualification from browser startup; `.compat/<major>/timings.json` separates installs, builds, packing, base/CDK AOT and SSR. These files describe the latest component run.

See the [developer guide](../../docs/README.DEV.md) for terminal log capture and the [CI guide](../../docs/COMPATIBILITY-CI.md) for matrix jobs and downloadable artifacts.
