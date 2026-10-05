# Evergreen showcase and versioned testbeds

The default host serves the latest Angular showcase. Its catalogue covers single/range selection, localization, calendars, validation, virtual scrolling, presentation, and styling, with live controls and diagnostics. Pickers render directly in the page. Version links navigate to separate apps.

```sh
npm run showcase:start
npm run showcase:build
node scripts/serve.cjs --prebuilt
```

Use Node 24.15+ for the combined build. Each app uses its version-specific TypeScript and Angular compiler; Angular 11 dependencies receive ngcc preparation. esbuild watches source and templates. The default app uses the latest runtime compiler. Each app is compiled independently into `dist/showcase` or `dist/showcase/runtime/N`.

The dev server logs build and rebuild starts, successful completion with elapsed time, and failures for the showcase and each Angular testbed. Refresh the browser after the relevant app reports `Rebuilt`; browser refresh is manual.

The generic Node HTTP server serves `wkly.localhost:4200` (and localhost/127.0.0.1 aliases) as the showcase, and `v11.wkly.localhost:4200` through `v22.wkly.localhost:4200` as testbeds. It falls back to the selected app's index for extensionless navigation, returns 404 for missing assets and unknown hosts, and prevents cross-app paths. `--prebuilt` does not load Angular or build tools. `WKLY_OUTPUT` changes the build/serve directory (use the same value for both commands), allowing isolated concurrent servers. `PORT` changes the port; `WKLY_DOMAIN` changes the local host suffix (custom domains require local DNS). Standard `.localhost` names must resolve to loopback in the browser/environment.

## Controlled pages

Each version exposes `/` as a case index and `/cases/<layout>/<example-id>` as a single-example page. Reloading a deep link preserves the case. IDs and feature configurations come from `src/pages.ts`.

| Layout | Purpose |
| --- | --- |
| `empty` | Minimal document; default for component behavior and pixel comparisons |
| `contained` | Fixed maximum-width card with padding and a border |
| `form` | Actual form with neighboring native inputs and a submit button |
| `booking` | Small realistic page with header, responsive columns, summary and footer |

For example, `/cases/empty/date-range`, `/cases/form/dialog`, `/cases/contained/overlay`, and `/cases/booking/material` work on every version. Native dialog and CDK overlay pickers attach to the top-level document. The anchored overlay uses WKLY's CDK integration.

Controls, diagnostics and layouts are shared source. Testbeds include their own bounded shell CSS and picker theme rules.

The versioned `/contracts` route hosts public Angular API checks with scoped configuration and localization providers. Query parameters `presentation=inline|dialog|overlay` and `calendar=gregorian|hebrew|hijri` select the fixture, and `initial=<epochDay>` sets an explicit initial anchor. Its buttons call public jump methods and update runtime inputs; outputs expose committed values, validation codes, and emission counts.

`/cases/empty/hebrew` and `/cases/empty/hijri` provide RTL datetime examples on every Angular version. `/calendars` renders paired Gregorian, Hebrew, and Hijri date pickers in both the evergreen showcase and versioned testbeds; selecting any picker updates its companions without emitting additional user edits. The Hijri example uses the source-only `islamic-civil` adapter; see [adapter rules and bounds](CORE-AND-ADAPTERS.md).

## Playwright

```sh
npm run test:browsers:install
npm run showcase:build
npm run test:showcase -- --project="*-chromium-showcase" --project=chromium-catalogue
npm run test:showcase -- --project=angular-22-firefox-showcase
npm run test:showcase -- testbeds.spec.cjs
```

The current matrix combines all registered Angular versions with Chromium, Firefox and WebKit, plus one evergreen catalogue journey per engine. `WKLY_TEST_ANGULAR=11,22` and `WKLY_TEST_BROWSERS=chromium` restrict component runs. Set environment variables using your shell's syntax (PowerShell: `$env:WKLY_TEST_ANGULAR='11,22'`). `WKLY_SHOWCASE_PORT` changes the test host's default port 4330. All versions run the same cases against independently built apps.

The current Playwright suite serves prebuilt showcase assets and starts its own server. `npm run showcase:build` prepares those assets; `WKLY_E2E=1` optionally enables the showcase's fixed test clock. PR and release profiles build the showcase before running these journeys.

Picker domain fixtures use the same `vN.wkly.localhost` hostnames on their own port (4318 by default), with `/index.html` loading a minimal fixture app. The showcase's case routes remain on its separate server.

Picker screenshots belong to the current layout domain, rather than the showcase suite. Angular versions share four month-boundary baselines per engine; the update command selects one Angular version to avoid concurrent writes:

```sh
npm run test:visuals:update
```

Baselines are platform-specific; review updates on the same platform. Geometry assertions run independently of screenshots. Open the native showcase report with `npm run test:report:showcase`. `node --test scripts/showcase-server.test.cjs` checks host routing, fallback and isolation without Angular.

To add an Angular major, register it in `supported-angular.json`, add its versioned runtime/package/toolchain, and update the evergreen module import and host tsconfig to the newest runtime. Library compatibility and packaging scripts remain separate from this browser setup.
