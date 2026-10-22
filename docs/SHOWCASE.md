# Public showcase

The showcase is the public landing page and live demo, compiled with the newest supported Angular runtime. Its catalogue covers single/range selection, localization, calendars, validation, virtual scrolling, presentations and styling. Version selectors, controlled `/cases` pages and `/contracts` hosts have been removed. Angular compatibility and picker behavior belong to the independent [test project](../projects/wkly-datetime-picker.tests/README.md).

```sh
npm run showcase:start
npm run showcase:build
node scripts/serve.cjs --prebuilt
```

Use Node 24.15+. The build produces one JavaScript/CSS bundle and real HTML entry documents for the overview and each public route in `dist/showcase`. Every entry includes a readable heading, description and example links before Angular boots. Titles and route-specific descriptions come from `src/page-metadata.json`; keep its keys aligned with `src/pages.ts`. Descriptions combine the common introduction in `src/site-metadata.json` with each route's own text; keep every combined description between 25 and 160 characters inclusive. Angular updates the description, Open Graph, and Twitter title/description when navigating between examples; static route documents include the same metadata for crawlers.

All routes share the committed 1440 × 756 PNG at `src/metaimages/wkly.png`, captured from the compiled showcase's real date picker. Open Graph tags include its dimensions, type, and alt text; Twitter uses `summary_large_image`. To refresh the artwork after calendar or branding changes, run `npm run showcase:build`, `npm run showcase:preview`, then `npm run showcase:build` again to copy the updated image into the output. The preview command uses Playwright Chromium and a fixed date for reproducibility; inspect the image before committing it. Set `WKLY_SITE_URL` for deployment so social image URLs are absolute and include the deployment base path.

The local server serves `wkly.localhost:4200` and localhost/127.0.0.1 aliases. It serves generated routes directly, returns 404 for unknown routes/assets/hosts and blocks access to obsolete runtime assets. Versioned subdomains are no longer showcase hosts. `--prebuilt` does not load build tools. `WKLY_OUTPUT` changes the output directory (use the same value for build and serve), `PORT` changes the port, and `WKLY_DOMAIN` changes the local hostname. The dev server watches source/templates and logs rebuilds; refresh manually after `Rebuilt`.

Every example's "Configure this example" controls include "Show local time", checked by default and restored by Reset example. The host supplies `nowUtcOffsetMinutes` as `-new Date().getTimezoneOffset()` when checked, and `0` when unchecked. The checkbox affects subsequent Now actions only. An information button beside it opens a native popover explaining the binding and shifted UTC wire value; Escape or clicking outside dismisses it. Each demo has its own popover ID.

## GitHub Pages

[The Pages workflow](../.github/workflows/pages.yml) builds and smoke-tests the public demo, then publishes `dist/showcase` on pushes to main or manual dispatch. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** before running it. No deployment was performed as part of the local implementation.

The workflow obtains the base path and public URL from GitHub, supporting repository Pages URLs and custom domains. Local builds default to `/`. To reproduce the repository deployment in PowerShell:

```powershell
$env:WKLY_BASE_PATH='/wkly-datetime-picker/'
$env:WKLY_SITE_URL='https://cokkto.github.io/wkly-datetime-picker/'
npm run showcase:build
npm run test:showcase
node scripts/serve.cjs --prebuilt
```

`WKLY_BASE_PATH` must start and end with `/`. `WKLY_SITE_URL`, when supplied, must be the full public URL including that same path and trailing slash. It adds canonical/Open Graph URLs and `sitemap.xml`. The build includes `.nojekyll`. Normal path routes have their own `index.html`, so direct navigation/reload works without a server rewrite or hash routing. Static landing copy is available without JavaScript; interactive picker controls require JavaScript. These are search foundations, not a promise of indexing or rankings.

## Minimal smoke coverage

```sh
npm run showcase:build
npm run test:showcase
npm run test:showcase -- --project=chromium-showcase
```

One journey per browser visits every public route and checks a successful document response, its title, compiled WKLY demo controls, initial value diagnostics and absence of browser errors. The full command runs three journeys: Chromium, Firefox and WebKit. It does not repeat picker behavior tests. Build and test must use the same `WKLY_BASE_PATH`; `WKLY_TEST_BROWSERS` selects engines and `WKLY_SHOWCASE_PORT` changes the default test port 4330. PR/release profiles retain this small smoke gate; Pages deployment checks Chromium. Open the report with `npm run test:report:showcase`.

`node --test scripts/showcase-server.test.cjs` checks static routes, removed routes, subpath serving and invalid requests without Angular. Picker screenshots remain in the picker layout domain, with `npm run test:visuals:update` for deliberate baseline updates.

The paired Gregorian/Hebrew/Hijri example remains at `/calendars/`. See [adapter rules and bounds](CORE-AND-ADAPTERS.md). To add an Angular major, register its package/toolchain and update the showcase's runtime import and host tsconfig to the newest version.
