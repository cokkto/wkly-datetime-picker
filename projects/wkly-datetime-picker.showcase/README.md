# Evergreen showcase and versioned testbeds

The default host serves the latest Angular showcase. It preserves the single/range, localization, calendar, validation, virtual scrolling, presentation, and styling catalogue, with live controls and diagnostics. Pickers render directly in the page. Version links navigate to separate apps; the catalogue does not embed them.

```sh
npm run showcase:start
npm run showcase:build
node scripts/serve.cjs --prebuilt
```

Use Node 24.15+ for the combined build. Existing per-version TypeScript compilers, dependency resolution, Angular compiler handling, Angular 11 ngcc preparation, and esbuild watching are retained. The default app uses the latest runtime compiler too. Each app is compiled independently into `dist/showcase` or `dist/showcase/runtime/N`.

The generic Node HTTP server serves `wkly.localhost:4200` (and localhost/127.0.0.1 aliases) as the showcase, and `v11.wkly.localhost:4200` through `v22.wkly.localhost:4200` as testbeds. It falls back to the selected app's index for extensionless navigation, returns 404 for missing assets and unknown hosts, and prevents cross-app paths. `--prebuilt` does not load Angular or build tools. `WKLY_OUTPUT` changes the build/serve directory (use the same value for both commands), allowing isolated concurrent servers. `PORT` changes the port; `WKLY_DOMAIN` changes the local host suffix (custom domains require local DNS). Standard `.localhost` names must resolve to loopback in the browser/environment.

## Controlled pages

Each version exposes `/` as a case index and `/cases/<layout>/<example-id>` as a single-example page. Reloading a deep link preserves the case. IDs and feature configurations come from `src/pages.ts`.

| Layout | Purpose |
| --- | --- |
| `empty` | Minimal document; default for component behavior and pixel comparisons |
| `contained` | Fixed maximum-width card with padding and a border |
| `form` | Actual form with neighboring native inputs and a submit button |
| `booking` | Small realistic page with header, responsive columns, summary and footer |

For example, `/cases/empty/date-range`, `/cases/form/dialog`, `/cases/contained/overlay`, and `/cases/booking/material` work on every version. Native dialog and CDK overlay pickers attach to the actual top-level document. CDK coverage uses WKLY's existing anchored CDK dialog presentation, supported across all versions; it does not require the newer `@angular/cdk/dialog` package.

Controls, diagnostics and layouts are shared source. Testbeds include their own bounded shell CSS and picker theme rules, never the showcase stylesheet. Tests deliberately do not attempt to support infinitely many consumer resets or layouts.

## Playwright

```sh
npm run showcase:browsers
npm run showcase:test:e2e -- --project="*-chromium"
npm run showcase:test:e2e -- --project=angular-22-firefox
npm run showcase:test:e2e -- testbeds.spec.ts
```

The default matrix combines all supported Angular versions with Chromium, Firefox, WebKit, installed Edge, Chromium at DPR 1.5, and mobile Chromium. `WKLY_ANGULAR=11,22` restricts the versions. Set environment variables using your shell's syntax (PowerShell: `$env:WKLY_ANGULAR='11,22'`). Set `PORT=4300` if the default port is occupied. Each project changes only its baseURL and device settings; all versions run the same cases.

Playwright builds with `WKLY_E2E=1`, fixing the clock at `2099-12-16T13:00:00.000Z`, UTC timezone and reduced motion. CI uses prebuilt assets, so its build must also set `WKLY_E2E=1`. Normal showcase builds use the real clock. Reuse a deliberately prepared test server with `WKLY_E2E_REUSE_SERVER=1`.

Screenshot assertions capture only the picker. Angular versions share browser-specific baselines; update using just one version to avoid concurrent writes:

```sh
npm run showcase:test:e2e:update -- --project=angular-22-chromium --grep "rendered weeks"
```

Baselines are Windows-specific; review updates on the same platform. Geometry assertions run independently of screenshots. Trace, video and screenshots are retained on failure. `node --test scripts/showcase-server.test.cjs` checks host routing, fallback and isolation without Angular.

To add an Angular major, register it in `supported-angular.json`, add its versioned runtime/package/toolchain, and update the evergreen module import and host tsconfig to the newest runtime. Library compatibility and packaging scripts remain separate from this browser setup.
