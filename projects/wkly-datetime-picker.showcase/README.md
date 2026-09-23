# WKLY visual test project

This private Angular application imports the public workspace entry points. Library source/templates rebuild while the development server runs; refresh to see changes. No picker behavior is simulated in the host. Material and the Hebrew adapter are private test dependencies.

```sh
npm ci --legacy-peer-deps
npm run showcase:start       # http://127.0.0.1:4200; real UTC clock
npm run showcase:build       # dist/showcase; static application
```

Static hosts must fall back to index.html for Angular routes. The development/test server does this automatically. Fonts, assets, and locale data are local.

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

Interaction tests run in Chromium, Firefox, WebKit, and touch-enabled mobile Chromium. Screenshots run only in Chromium. Failures retain trace, screenshot, and video. Tests begin from direct routes and independent fixtures.

```sh
npm run showcase:test:e2e:update -- --project=chromium
npm run showcase:test:e2e -- --project=chromium
```

Baseline updates are explicit. Review PNG diffs under e2e/baselines/chromium before committing. Ordinary tests do not rewrite baselines. The checked-in baselines are generated on Windows; compare them on the same OS and Playwright versions.

Node 16/18 uses a compatible legacy Playwright runner for interactions; Node 20+ uses current browsers and screenshot comparisons. The `showcase:browsers` script automatically installs the matching engines. Use modern Node for baseline updates and browser-support verification.

`npm test` exhaustively round-trips the Hebrew adapter over its Gregorian 1900–2100 interval. `npm run pack:check` checks that this application, its tests, and showcase-only dependencies are absent from publishable packages.
