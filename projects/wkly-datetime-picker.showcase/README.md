# WKLY visual test project

This private Angular 22 application owns the routed UI, examples, controls, and translations. It sends serializable configuration to calendar runtimes in iframes. Each runtime boots its own Angular major and imports the matching `wkly-datetime-picker.N` package. Library source and templates rebuild while the development server runs; refresh after an edit to view changes. Material and the Hebrew adapter are private runtime dependencies.

```sh
corepack pnpm install
npm run showcase:start       # http://127.0.0.1:4200; real UTC clock
npm run showcase -- --angular=18  # choose initial runtime (11 or 18)
npm run showcase:build       # dist/showcase; host and all runtimes
```

Static hosts must fall back to index.html for Angular routes. The development/test server does this automatically. Fonts, assets, and locale data are local.

The Angular runtime menu reads `supported-angular.json` and selects the highest supported major by default. Angular 11 and 18 are registered. To add a major, add its `wkly-datetime-picker.N` package, a small `projects/wkly-datetime-picker.runtime.N` app with its own dependency versions, and an entry in `supported-angular.json` with the required Node version and pinned compatibility dependencies. CI creates its compatibility matrix from those entries and tests isolated packed consumers; see [compatibility CI](../../docs/COMPATIBILITY-CI.md). The build script bundles each runtime separately; the main showcase and its configs remain shared. The pnpm workspace shares its package store and keeps Angular toolchains in versioned importers.

The host sends `wkly:configure` with mode, locale, value, bounds, translation catalog, styling, and other plain data; `wkly:jump` requests a distant scroll. Runtimes answer with `wkly:ready`, value and validation changes, open/close and viewport events, form state, height, or `wkly:error`. Both sides check same-origin messages and the matching iframe/window source. No Angular instance or callback crosses the boundary. The protocol types are in `src/runtime-protocol.ts`.

| Route | Content |
| --- | --- |
| / | Feature index, package versions, live picker |
| /single | Datetime/date/time, seconds, 12/24 hours |
| /ranges | All range modes and stacked endpoints |
| /presentations | Inline, native dialog, raw CDK, Material-hosted CDK |
| /localization | Hebrew calendar/RTL, Arabic digits/RTL, US Sunday-first/AM-PM |
| /calendars | Shared Gregorian/Hebrew epoch identity, pre-1970 and leap month |
| /validation | Required, bounds, disabled values/crossing, impossible drafts |
| /virtualization | All presets, distant jumps, week diagnostics |
| /styling | Default/custom colors and size multipliers |

Every panel has expandable configuration, committed UTC output, validation codes, emission count, effective locale/calendar/offset/hour cycle, and host Reset/Clear controls.

## Playwright

```sh
npm run showcase:browsers
npm run showcase:test:e2e
npm run showcase:test:e2e -- --project=chromium --headed
npm run showcase:test:e2e -- --project=chromium --debug
npx playwright show-report
npx playwright show-trace test-results/<failure>/trace.zip
```

Playwright starts/stops port 4200 automatically and injects `2099-12-16T13:00:00.000Z`. Browser timezone is UTC and motion is reduced. Close normal development servers before running tests. Production development uses the real clock.

The iframe bridge suite runs in Chromium, Firefox, WebKit, and touch-enabled mobile Chromium. Failures retain trace, screenshot, and video. The previous direct-DOM specs and screenshot baselines remain as migration references; they predate the iframe boundary and are excluded by `playwright.config.ts` until ported.

```sh
npm run showcase:test:e2e:update -- --project=chromium
npm run showcase:test:e2e -- --project=chromium
```

Baseline updates are explicit. Existing PNGs under e2e/baselines/chromium describe the former direct-rendered app and should be regenerated after screenshot specs are ported.

Use Node 24.15+ for showcase builds and browser tests. The isolated library compatibility jobs use Node 16 for Angular 11 and Node 20 for Angular 18.

`npm test` exhaustively round-trips the Hebrew adapter over its Gregorian 1900–2100 interval. `npm run pack:check` checks that this application, its tests, and showcase-only dependencies are absent from publishable packages.
